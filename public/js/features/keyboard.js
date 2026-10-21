import { ActionType } from '../core/calculator-state.js';

const operator = (value) => Object.freeze({ type: ActionType.OPERATOR, value });

/** Physical keys (including the numeric keypad) → calculator actions. */
const KEY_ACTIONS = Object.freeze({
  '+': operator('+'),
  '-': operator('-'),
  '*': operator('*'),
  x: operator('*'),
  X: operator('*'),
  '/': operator('/'),
  '(': { type: ActionType.OPEN_PAREN },
  ')': { type: ActionType.CLOSE_PAREN },
  '.': { type: ActionType.DECIMAL },
  ',': { type: ActionType.DECIMAL },
  Decimal: { type: ActionType.DECIMAL },
  Enter: { type: ActionType.EQUALS },
  '=': { type: ActionType.EQUALS },
  Backspace: { type: ActionType.BACKSPACE },
  Escape: { type: ActionType.CLEAR },
  Delete: { type: ActionType.CLEAR },
});

/**
 * Translates a keyboard event into a calculator action, or null when the
 * key is not a calculator key or is part of a browser/OS shortcut.
 * @param {Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'> & { isComposing?: boolean }} event
 */
export function keyToAction({ key, ctrlKey, metaKey, altKey, isComposing }) {
  if (ctrlKey || metaKey || altKey || isComposing) return null;
  if (typeof key === 'string' && /^[0-9]$/.test(key)) {
    return { type: ActionType.DIGIT, value: key };
  }
  return Object.hasOwn(KEY_ACTIONS, key) ? KEY_ACTIONS[key] : null;
}
