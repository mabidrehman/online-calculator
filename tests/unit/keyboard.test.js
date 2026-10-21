import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ActionType } from '../../public/js/core/calculator-state.js';
import { keyToAction } from '../../public/js/features/keyboard.js';

const key = (value, modifiers = {}) => keyToAction({ key: value, ...modifiers });

describe('keyToAction', () => {
  it('maps every digit', () => {
    for (let digit = 0; digit <= 9; digit += 1) {
      assert.deepEqual(key(String(digit)), { type: ActionType.DIGIT, value: String(digit) });
    }
  });

  it('maps operators, including x as multiply', () => {
    assert.deepEqual(key('+'), { type: ActionType.OPERATOR, value: '+' });
    assert.deepEqual(key('-'), { type: ActionType.OPERATOR, value: '-' });
    assert.deepEqual(key('*'), { type: ActionType.OPERATOR, value: '*' });
    assert.deepEqual(key('x'), { type: ActionType.OPERATOR, value: '*' });
    assert.deepEqual(key('X'), { type: ActionType.OPERATOR, value: '*' });
    assert.deepEqual(key('/'), { type: ActionType.OPERATOR, value: '/' });
  });

  it('maps both decimal separators', () => {
    assert.equal(key('.').type, ActionType.DECIMAL);
    assert.equal(key(',').type, ActionType.DECIMAL);
    assert.equal(key('Decimal').type, ActionType.DECIMAL);
  });

  it('maps control keys', () => {
    assert.equal(key('Enter').type, ActionType.EQUALS);
    assert.equal(key('=').type, ActionType.EQUALS);
    assert.equal(key('Backspace').type, ActionType.BACKSPACE);
    assert.equal(key('Escape').type, ActionType.CLEAR);
    assert.equal(key('Delete').type, ActionType.CLEAR);
    assert.equal(key('(').type, ActionType.OPEN_PAREN);
    assert.equal(key(')').type, ActionType.CLOSE_PAREN);
  });

  it('ignores browser and OS shortcuts', () => {
    assert.equal(key('c', { ctrlKey: true }), null);
    assert.equal(key('1', { ctrlKey: true }), null);
    assert.equal(key('+', { metaKey: true }), null);
    assert.equal(key('2', { altKey: true }), null);
  });

  it('ignores keys during IME composition', () => assert.equal(key('1', { isComposing: true }), null));

  it('ignores unrelated keys and prototype names', () => {
    for (const value of ['a', 'Tab', 'ArrowLeft', 'F5', ' ', '', 'toString', '__proto__', '10', undefined]) {
      assert.equal(key(value), null, String(value));
    }
  });
});
