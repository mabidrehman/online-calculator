import { readFileSync } from 'node:fs';

import { JSDOM } from 'jsdom';

import { initCalculatorApp } from '../../public/js/app.js';

export const INDEX_HTML = readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');

/**
 * Loads the real index.html into jsdom with the given localStorage contents.
 * Page scripts are not auto-run; tests may still run code via window.eval.
 */
export function createPageDom({ storage = {}, html = INDEX_HTML } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
  for (const [key, value] of Object.entries(storage)) {
    dom.window.localStorage.setItem(key, value);
  }
  return dom;
}

/** Boots the app on a fresh page and returns helpers to drive it like a user. */
export function createApp(options) {
  const dom = createPageDom(options);
  const { window } = dom;
  const { document } = window;
  initCalculatorApp({ document, window });

  const keypadButton = (action, value) =>
    [...document.querySelectorAll('#keypad button')].find(
      (button) => button.dataset.action === action && (value === undefined || button.dataset.value === value),
    );

  const BUTTON_FOR_SYMBOL = {
    '.': ['decimal'],
    '(': ['openParen'],
    ')': ['closeParen'],
    '=': ['equals'],
    '<': ['backspace'],
    C: ['clear'],
  };

  return {
    window,
    document,
    keypadButton,

    /** Clicks keypad buttons: digits, + - * /, and . ( ) = < (backspace) C (clear). */
    click(sequence) {
      for (const symbol of sequence) {
        const [action, value] = /^[0-9]$/.test(symbol)
          ? ['digit', symbol]
          : '+-*/'.includes(symbol)
            ? ['operator', symbol]
            : BUTTON_FOR_SYMBOL[symbol];
        const button = keypadButton(action, value);
        if (!button) throw new Error(`No keypad button for "${symbol}"`);
        button.click();
      }
    },

    /** Dispatches a keydown on `target` (default: body); returns the event. */
    press(key, { target = document.body, ...init } = {}) {
      const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
      target.dispatchEvent(event);
      return event;
    },

    type(keys) {
      for (const key of keys) this.press(key);
    },

    primary: () => document.getElementById('display-primary').textContent,
    secondary: () => document.getElementById('display-secondary').textContent,
    error: () => document.getElementById('display-error').textContent,
    historyItems: () =>
      [...document.querySelectorAll('#history-list .history-entry')].map((button) => button.textContent),
  };
}
