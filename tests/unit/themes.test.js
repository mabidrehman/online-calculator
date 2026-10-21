import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, mock } from 'node:test';

import {
  DEFAULT_THEME_ID,
  THEMES,
  THEME_STORAGE_KEY,
  createThemeController,
  isThemeId,
} from '../../public/js/features/themes.js';
import { createSafeStorage } from '../../public/js/shared/storage.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

const readPublicFile = (path) => readFileSync(new URL(`../../public/${path}`, import.meta.url), 'utf8');

function setup(initialTheme) {
  const root = { dataset: initialTheme === undefined ? {} : { theme: initialTheme } };
  const backend = createMemoryStorage();
  const controller = createThemeController({ root, storage: createSafeStorage(() => backend) });
  return { root, backend, controller };
}

describe('themes', () => {
  beforeEach(() => mock.method(console, 'warn', () => {}));

  it('offers exactly eight themes with unique ids', () => {
    assert.equal(THEMES.length, 8);
    assert.equal(new Set(THEMES.map((theme) => theme.id)).size, 8);
  });

  it('validates theme ids', () => {
    assert.ok(isThemeId('oscuro'));
    assert.ok(!isThemeId('"><script>'));
    assert.ok(!isThemeId(undefined));
  });

  it('keeps a valid theme applied by the boot script', () => {
    const { root, controller } = setup('bosque');
    assert.equal(controller.getCurrent(), 'bosque');
    assert.equal(root.dataset.theme, 'bosque');
  });

  it('falls back to the default for missing or unknown themes', () => {
    assert.equal(setup().controller.getCurrent(), DEFAULT_THEME_ID);
    const { root, controller } = setup('hacked');
    assert.equal(controller.getCurrent(), DEFAULT_THEME_ID);
    assert.equal(root.dataset.theme, DEFAULT_THEME_ID);
  });

  it('applies and persists a new theme', () => {
    const { root, backend, controller } = setup();
    assert.equal(controller.setTheme('lavanda'), true);
    assert.equal(root.dataset.theme, 'lavanda');
    assert.equal(backend.dump()[THEME_STORAGE_KEY], 'lavanda');
  });

  it('rejects unknown themes without changing anything', () => {
    const { root, backend, controller } = setup('retro');
    assert.equal(controller.setTheme('nope'), false);
    assert.equal(root.dataset.theme, 'retro');
    assert.equal(backend.dump()[THEME_STORAGE_KEY], undefined);
  });

  it('defines CSS for every theme', () => {
    const css = readPublicFile('css/themes.css');
    for (const { id } of THEMES) {
      assert.ok(css.includes(`[data-theme="${id}"]`), `missing CSS for theme "${id}"`);
    }
  });

  it('boot script uses the same storage key and valid fallback themes', () => {
    const bootScript = readPublicFile('js/theme-boot.js');
    assert.ok(bootScript.includes(`'${THEME_STORAGE_KEY}'`), 'storage key mismatch');
    for (const [, id] of bootScript.matchAll(/\? '([a-z-]+)' : '([a-z-]+)'/g)) {
      assert.ok(isThemeId(id), `boot script references unknown theme "${id}"`);
    }
    assert.match(bootScript, /\? '([a-z-]+)' : '([a-z-]+)'/, 'expected a light/dark fallback');
  });
});
