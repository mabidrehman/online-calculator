import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, it, mock } from 'node:test';

import { initCalculatorApp } from '../../public/js/app.js';
import { HISTORY_STORAGE_KEY } from '../../public/js/features/history.js';
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '../../public/js/features/themes.js';
import { createApp, createPageDom } from '../helpers/dom.js';

beforeEach(() => mock.method(console, 'warn', () => {}));

describe('app: initial render', () => {
  it('shows 0, an empty history and a six-option theme dropdown set to Claro', () => {
    const app = createApp();
    assert.equal(app.primary(), '0');
    assert.equal(app.secondary(), '');
    assert.equal(app.error(), '');
    assert.equal(app.document.getElementById('history-empty').hidden, false);
    assert.equal(app.document.getElementById('history-list').hidden, true);
    assert.equal(app.document.getElementById('history-clear').disabled, true);
    const select = app.document.getElementById('theme-select');
    assert.deepEqual(
      [...select.options].map((option) => option.textContent),
      ['Claro', 'Oscuro', 'Azul', 'Verde', 'Lavanda', 'Alto contraste'],
    );
    assert.equal(select.value, 'claro');
    assert.equal(app.document.documentElement.getAttribute(THEME_ATTRIBUTE), 'claro');
  });
});

describe('app: calculating with the keypad', () => {
  it('respects operator precedence', () => {
    const app = createApp();
    app.click('12+3*2=');
    assert.equal(app.primary(), '18');
    assert.equal(app.secondary(), '12+3×2 =');
  });

  it('shows a live preview while typing', () => {
    const app = createApp();
    app.click('12+3');
    assert.equal(app.primary(), '12+3');
    assert.equal(app.secondary(), '= 15');
  });

  it('formats decimals with a comma', () => {
    const app = createApp();
    app.click('1.5+1=');
    assert.equal(app.primary(), '2,5');
    assert.equal(app.secondary(), '1,5+1 =');
  });

  it('handles 0.1 + 0.2 exactly', () => {
    const app = createApp();
    app.click('.1+.2=');
    assert.equal(app.primary(), '0,3');
  });

  it('handles negative numbers', () => {
    const app = createApp();
    app.click('-5*-3=');
    assert.equal(app.primary(), '15');
    app.click('C2-5=');
    assert.equal(app.primary(), '−3');
  });

  it('handles parentheses and auto-closes them', () => {
    const app = createApp();
    app.click('2*(3+4=');
    assert.equal(app.primary(), '14');
    assert.equal(app.secondary(), '2×(3+4) =');
  });

  it('chains from the previous result', () => {
    const app = createApp();
    app.click('2+3=*4=');
    assert.equal(app.primary(), '20');
  });

  it('backspace and clear edit the expression', () => {
    const app = createApp();
    app.click('123<');
    assert.equal(app.primary(), '12');
    app.click('C');
    assert.equal(app.primary(), '0');
  });
});

describe('app: errors', () => {
  it('shows a Spanish message for division by zero and recovers', () => {
    const app = createApp();
    app.click('5/0=');
    assert.equal(app.error(), 'No se puede dividir entre cero.');
    assert.equal(app.primary(), '5÷0');
    app.click('<2=');
    assert.equal(app.error(), '');
    assert.equal(app.primary(), '2,5');
  });

  it('shows a message for an incomplete expression', () => {
    const app = createApp();
    app.click('5+=');
    assert.equal(app.error(), 'La operación está incompleta.');
  });

  it('does not add failed calculations to history', () => {
    const app = createApp();
    app.click('5/0=');
    assert.deepEqual(app.historyItems(), []);
  });

  it('shows a message when the input is too long', () => {
    const app = createApp();
    app.click('1'.repeat(101));
    assert.match(app.error(), /100 caracteres/);
  });
});

describe('app: keyboard', () => {
  it('calculates from typed keys and Enter', () => {
    const app = createApp();
    app.type(['2', '*', '(', '3', '+', '4', ')', 'Enter']);
    assert.equal(app.primary(), '14');
  });

  it('supports comma, Backspace and Escape', () => {
    const app = createApp();
    app.type(['1', ',', '5', '9', 'Backspace']);
    assert.equal(app.primary(), '1,5');
    app.press('Escape');
    assert.equal(app.primary(), '0');
  });

  it('prevents browser defaults only for calculator keys', () => {
    const app = createApp();
    assert.equal(app.press('/').defaultPrevented, true);
    assert.equal(app.press('Tab').defaultPrevented, false);
    assert.equal(app.press('r', { ctrlKey: true }).defaultPrevented, false);
  });

  it('ignores Ctrl/Cmd shortcuts', () => {
    const app = createApp();
    app.press('5', { ctrlKey: true });
    assert.equal(app.primary(), '0');
  });

  it('treats Enter on a focused keypad key as equals, not a repeat click', () => {
    const app = createApp();
    app.click('2+3');
    const focusedKey = app.keypadButton('digit', '3');
    const event = app.press('Enter', { target: focusedKey });
    assert.equal(event.defaultPrevented, true);
    assert.equal(app.primary(), '5');
  });

  it('leaves Enter alone on other controls such as the FAQ', () => {
    const app = createApp();
    app.click('2+3');
    const summary = app.document.querySelector('.faq summary');
    assert.equal(app.press('Enter', { target: summary }).defaultPrevented, false);
    assert.equal(app.primary(), '2+3');
  });

  it('highlights the matching on-screen key', () => {
    const app = createApp();
    app.press('7');
    assert.ok(app.keypadButton('digit', '7').classList.contains('is-pressed'));
  });
});

describe('app: history', () => {
  it('shows only the latest calculation, replacing the previous one', () => {
    const app = createApp();
    app.click('1+1=');
    assert.deepEqual(app.historyItems(), ['1+1 =2']);
    app.click('C2*3=');
    assert.deepEqual(app.historyItems(), ['2×3 =6']);
    assert.equal(app.document.querySelectorAll('#history-list li').length, 1);
    assert.equal(app.document.getElementById('history-empty').hidden, true);
    assert.equal(app.document.getElementById('history-clear').disabled, false);
    const saved = JSON.parse(app.window.localStorage.getItem(HISTORY_STORAGE_KEY));
    assert.deepEqual(saved, [{ expression: '2*3', result: '6' }]);
  });

  it('does not replace the latest calculation when one fails', () => {
    const app = createApp();
    app.click('1+1=C5/0=');
    assert.deepEqual(app.historyItems(), ['1+1 =2']);
  });

  it('keeps only the newest entry from previously saved multi-entry history', () => {
    const app = createApp({
      storage: {
        [HISTORY_STORAGE_KEY]: JSON.stringify([
          { expression: '9-1', result: '8' },
          { expression: '1+1', result: '2' },
        ]),
      },
    });
    assert.deepEqual(app.historyItems(), ['9−1 =8']);
  });

  it('loads saved history on start', () => {
    const app = createApp({
      storage: { [HISTORY_STORAGE_KEY]: JSON.stringify([{ expression: '7*6', result: '42' }]) },
    });
    assert.deepEqual(app.historyItems(), ['7×6 =42']);
  });

  it('reuses a result when an entry is clicked', () => {
    const app = createApp();
    app.click('7*6=C');
    app.document.querySelector('.history-entry').click();
    assert.equal(app.primary(), '42');
    assert.equal(app.secondary(), '7×6 =');
    app.click('+1=');
    assert.equal(app.primary(), '43');
  });

  it('gives entries an accessible label', () => {
    const app = createApp();
    app.click('1.5*2=');
    const label = app.document.querySelector('.history-entry').getAttribute('aria-label');
    assert.equal(label, 'Usar resultado 3 de 1,5×2');
  });

  it('clears history and storage', () => {
    const app = createApp();
    app.click('1+1=');
    app.document.getElementById('history-clear').click();
    assert.deepEqual(app.historyItems(), []);
    assert.equal(app.window.localStorage.getItem(HISTORY_STORAGE_KEY), null);
    assert.equal(app.document.getElementById('history-clear').disabled, true);
  });

  it('never renders tampered stored history as HTML', () => {
    const payload = '<img src=x onerror="window.__xss=1">';
    const app = createApp({
      storage: {
        [HISTORY_STORAGE_KEY]: JSON.stringify([
          { expression: payload, result: '1' },
          { expression: '1+1', result: payload },
        ]),
      },
    });
    assert.deepEqual(app.historyItems(), []);
    assert.equal(app.document.querySelector('#history-list img'), null);
    assert.equal(app.window.__xss, undefined);
  });
});

describe('app: themes', () => {
  function chooseTheme(app, themeId) {
    const select = app.document.getElementById('theme-select');
    select.value = themeId;
    select.dispatchEvent(new app.window.Event('change', { bubbles: true }));
  }

  it('applies and remembers the theme chosen in the dropdown', () => {
    const app = createApp();
    chooseTheme(app, 'azul');
    assert.equal(app.document.documentElement.getAttribute(THEME_ATTRIBUTE), 'azul');
    assert.equal(app.window.localStorage.getItem(THEME_STORAGE_KEY), 'azul');
  });

  it('labels the dropdown "Tema de color"', () => {
    const app = createApp();
    const label = app.document.querySelector('label[for="theme-select"]');
    assert.equal(label.textContent.trim(), 'Tema de color');
  });

  it('places the dropdown inside the calculator so only it is themed', () => {
    const app = createApp();
    assert.ok(app.document.querySelector('.calculator #theme-select'));
    assert.equal(app.document.querySelector('.side-panel #theme-select'), null);
  });

  it('selects the saved theme on start', () => {
    const dom = createPageDom({ storage: { [THEME_STORAGE_KEY]: 'verde' } });
    dom.window.document.documentElement.setAttribute(THEME_ATTRIBUTE, 'verde');
    initCalculatorApp({ document: dom.window.document, window: dom.window });
    assert.equal(dom.window.document.getElementById('theme-select').value, 'verde');
  });

  it('keeps calculating after switching themes', () => {
    const app = createApp();
    app.click('2+3');
    chooseTheme(app, 'alto-contraste');
    app.click('=');
    assert.equal(app.primary(), '5');
    assert.deepEqual(app.historyItems(), ['2+3 =5']);
  });
});

describe('app: resilience', () => {
  it('keeps working when localStorage is blocked', () => {
    const dom = createPageDom();
    Object.defineProperty(dom.window, 'localStorage', {
      get() {
        throw new Error('SecurityError');
      },
    });
    initCalculatorApp({ document: dom.window.document, window: dom.window });
    dom.window.document.querySelector('[data-action="digit"][data-value="4"]').click();
    dom.window.document.querySelector('[data-action="operator"][data-value="+"]').click();
    dom.window.document.querySelector('[data-action="digit"][data-value="4"]').click();
    dom.window.document.querySelector('[data-action="equals"]').click();
    assert.equal(dom.window.document.getElementById('display-primary').textContent, '8');
    assert.equal(dom.window.document.querySelectorAll('.history-entry').length, 1);
  });

  it('fails with a clear developer message when markup is missing', () => {
    const dom = createPageDom({ html: '<!DOCTYPE html><html><body></body></html>' });
    assert.throws(
      () => initCalculatorApp({ document: dom.window.document, window: dom.window }),
      /Missing required element #keypad/,
    );
  });

  it('main.js shows a user-facing message if the app cannot start', async (t) => {
    t.mock.method(console, 'error', () => {});
    const dom = createPageDom({
      html: '<!DOCTYPE html><html><body><p id="app-status"></p></body></html>',
    });
    globalThis.document = dom.window.document;
    globalThis.window = dom.window;
    try {
      await import('../../public/js/main.js');
    } finally {
      delete globalThis.document;
      delete globalThis.window;
    }
    assert.match(dom.window.document.getElementById('app-status').textContent, /no se pudo cargar/);
    assert.equal(console.error.mock.callCount(), 1);
  });
});

describe('theme-boot.js', () => {
  const bootScript = readFileSync(new URL('../../public/js/theme-boot.js', import.meta.url), 'utf8');

  function runBoot({ saved, prefersDark = false, blockStorage = false } = {}) {
    const dom = createPageDom({ storage: saved ? { [THEME_STORAGE_KEY]: saved } : {} });
    dom.window.matchMedia = (query) => ({ matches: prefersDark && query.includes('dark') });
    if (blockStorage) {
      Object.defineProperty(dom.window, 'localStorage', {
        get() {
          throw new Error('SecurityError');
        },
      });
    }
    dom.window.eval(bootScript);
    return dom.window.document.documentElement.getAttribute(THEME_ATTRIBUTE);
  }

  it('applies the saved theme', () => assert.equal(runBoot({ saved: 'lavanda' }), 'lavanda'));
  it('leaves first-time visitors on the default (Claro via CSS)', () => assert.equal(runBoot(), null));
  it('ignores a dark system preference for first-time visitors', () =>
    assert.equal(runBoot({ prefersDark: true }), null));
  it('survives blocked storage', () => assert.equal(runBoot({ blockStorage: true }), null));
});
