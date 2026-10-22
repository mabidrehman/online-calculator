import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, mock } from 'node:test';

import {
  DEFAULT_THEME_ID,
  THEMES,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  createThemeController,
  isThemeId,
} from '../../public/js/features/themes.js';
import { createSafeStorage } from '../../public/js/shared/storage.js';
import { createMemoryStorage } from '../helpers/memory-storage.js';

const readPublicFile = (path) => readFileSync(new URL(`../../public/${path}`, import.meta.url), 'utf8');

/** Minimal element double exposing the attribute API the controller uses. */
function createRoot(initialTheme) {
  const attributes = new Map(initialTheme === undefined ? [] : [[THEME_ATTRIBUTE, initialTheme]]);
  return {
    getAttribute: (name) => (attributes.has(name) ? attributes.get(name) : null),
    setAttribute: (name, value) => attributes.set(name, String(value)),
  };
}

function setup(initialTheme) {
  const root = createRoot(initialTheme);
  const backend = createMemoryStorage();
  const controller = createThemeController({ root, storage: createSafeStorage(() => backend) });
  return { root, backend, controller };
}

/** Extracts each theme's custom properties from themes.css. */
function parseThemeTokens(css) {
  const tokensByTheme = {};
  for (const [, id, body] of css.matchAll(/\[data-calculator-theme="([a-z-]+)"\] \.calculator \{([^}]*)\}/g)) {
    tokensByTheme[id] = Object.fromEntries(
      [...body.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
    );
  }
  return tokensByTheme;
}

/** WCAG 2.x contrast ratio between two #rrggbb colours. */
function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((index) => {
      const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('themes', () => {
  beforeEach(() => mock.method(console, 'warn', () => {}));

  it('offers the six required themes in order', () => {
    assert.deepEqual(
      THEMES.map((theme) => theme.label),
      ['Claro', 'Oscuro', 'Azul', 'Verde', 'Lavanda', 'Alto contraste'],
    );
    assert.equal(new Set(THEMES.map((theme) => theme.id)).size, 6);
  });

  it('uses Claro as the default', () => assert.equal(DEFAULT_THEME_ID, 'claro'));

  it('validates theme ids', () => {
    assert.ok(isThemeId('oscuro'));
    assert.ok(!isThemeId('retro'), 'removed themes are no longer valid');
    assert.ok(!isThemeId('"><script>'));
    assert.ok(!isThemeId(undefined));
  });

  it('keeps a valid theme applied by the boot script', () => {
    const { root, controller } = setup('verde');
    assert.equal(controller.getCurrent(), 'verde');
    assert.equal(root.getAttribute(THEME_ATTRIBUTE), 'verde');
  });

  it('falls back to Claro for missing, unknown or removed themes', () => {
    assert.equal(setup().controller.getCurrent(), 'claro');
    for (const stale of ['hacked', 'oceano', 'retro']) {
      const { root, controller } = setup(stale);
      assert.equal(controller.getCurrent(), 'claro');
      assert.equal(root.getAttribute(THEME_ATTRIBUTE), 'claro');
    }
  });

  it('applies and persists a new theme', () => {
    const { root, backend, controller } = setup();
    assert.equal(controller.setTheme('lavanda'), true);
    assert.equal(root.getAttribute(THEME_ATTRIBUTE), 'lavanda');
    assert.equal(backend.dump()[THEME_STORAGE_KEY], 'lavanda');
  });

  it('rejects unknown themes without changing anything', () => {
    const { root, backend, controller } = setup('azul');
    assert.equal(controller.setTheme('nope'), false);
    assert.equal(root.getAttribute(THEME_ATTRIBUTE), 'azul');
    assert.equal(backend.dump()[THEME_STORAGE_KEY], undefined);
  });

  it('boot script uses the same storage key and attribute, with no dark-mode fallback', () => {
    const bootScript = readPublicFile('js/theme-boot.js');
    assert.ok(bootScript.includes(`'${THEME_STORAGE_KEY}'`), 'storage key mismatch');
    assert.ok(bootScript.includes(`'${THEME_ATTRIBUTE}'`), 'attribute mismatch');
    assert.doesNotMatch(bootScript, /prefers-color-scheme/, 'first-time visitors must get Claro');
  });
});

describe('themes.css', () => {
  const css = readPublicFile('css/themes.css');
  const tokensByTheme = parseThemeTokens(css);
  const tokenNames = Object.keys(tokensByTheme.claro ?? {});

  it('defines exactly the themes in THEMES', () => {
    assert.deepEqual(Object.keys(tokensByTheme).sort(), THEMES.map((theme) => theme.id).sort());
  });

  it('makes Claro the default for the calculator', () => {
    assert.match(css, /^\.calculator,\s*\n\[data-calculator-theme="claro"\] \.calculator \{/m);
  });

  it('scopes every theme rule to the calculator only', () => {
    for (const selector of css.match(/^[^\s/*][^{]*\{/gm)) {
      for (const part of selector.replace('{', '').split(',')) {
        assert.match(part.trim(), /\.calculator$/, `"${part.trim()}" would theme the whole page`);
      }
    }
  });

  it('defines the same tokens in every theme', () => {
    for (const [id, tokens] of Object.entries(tokensByTheme)) {
      assert.deepEqual(Object.keys(tokens).sort(), [...tokenNames].sort(), `theme "${id}"`);
    }
  });

  const TEXT_PAIRS = [
    ['--color-display-text', '--color-display-bg'],
    ['--color-display-muted', '--color-display-bg'],
    ['--color-error', '--color-display-bg'],
    ['--color-key-text', '--color-key-bg'],
    ['--color-key-fn-text', '--color-key-fn-bg'],
    ['--color-key-op-text', '--color-key-op-bg'],
    ['--color-key-eq-text', '--color-key-eq-bg'],
    ['--color-text', '--color-surface'],
    ['--color-text-muted', '--color-surface'],
  ];

  for (const { id } of THEMES) {
    it(`"${id}" meets WCAG AA text contrast (4.5:1)`, () => {
      const tokens = tokensByTheme[id];
      for (const [foreground, background] of TEXT_PAIRS) {
        const ratio = contrastRatio(tokens[foreground], tokens[background]);
        assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio.toFixed(2)}`);
      }
      const focusRatio = contrastRatio(tokens['--color-accent'], tokens['--color-surface']);
      assert.ok(focusRatio >= 3, `focus ring contrast ${focusRatio.toFixed(2)}`);
    });
  }

  it('makes display digits at least 12:1 in every theme', () => {
    for (const { id } of THEMES) {
      const tokens = tokensByTheme[id];
      const ratio = contrastRatio(tokens['--color-display-text'], tokens['--color-display-bg']);
      assert.ok(ratio >= 12, `${id}: ${ratio.toFixed(2)}`);
    }
  });
});
