import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ActionType,
  INITIAL_STATE,
  MAX_EXPRESSION_LENGTH,
  applyAction,
  getPreviewResult,
} from '../../public/js/core/calculator-state.js';
import { ErrorCode } from '../../public/js/core/errors.js';
import { press } from '../helpers/press.js';

const expressionAfter = (sequence) => press(sequence).state.expression;

describe('calculator-state: digits and decimals', () => {
  it('starts empty', () => assert.deepEqual(INITIAL_STATE.expression, ''));
  it('appends digits', () => assert.equal(expressionAfter('123'), '123'));
  it('replaces a leading zero', () => assert.equal(expressionAfter('05'), '5'));
  it('does not stack zeros', () => assert.equal(expressionAfter('000'), '0'));
  it('replaces a leading zero after an operator', () => assert.equal(expressionAfter('1+05'), '1+5'));
  it('keeps zeros after a decimal point', () => assert.equal(expressionAfter('0.05'), '0.05'));
  it('prefixes a bare decimal point with zero', () => assert.equal(expressionAfter('.5'), '0.5'));
  it('prefixes zero after an operator', () => assert.equal(expressionAfter('2*.5'), '2*0.5'));
  it('allows only one decimal point per number', () => assert.equal(expressionAfter('1.2.3'), '1.23'));
  it('allows a decimal point in each number', () => assert.equal(expressionAfter('1.5+2.5'), '1.5+2.5'));
  it('ignores invalid digit values', () => {
    const { state } = applyAction(INITIAL_STATE, { type: ActionType.DIGIT, value: '<b>' });
    assert.equal(state, INITIAL_STATE);
  });
});

describe('calculator-state: operators', () => {
  it('appends an operator after a number', () => assert.equal(expressionAfter('2+'), '2+'));
  it('replaces a previous operator', () => assert.equal(expressionAfter('2+*'), '2*'));
  it('ignores a binary operator at the start', () => assert.equal(expressionAfter('*'), ''));
  it('allows a leading minus', () => assert.equal(expressionAfter('-5'), '-5'));
  it('ignores a second leading minus', () => assert.equal(expressionAfter('--5'), '-5'));
  it('ignores a binary operator after a leading minus', () => assert.equal(expressionAfter('-+5'), '-5'));
  it('allows minus after multiply', () => assert.equal(expressionAfter('5*-3'), '5*-3'));
  it('allows minus after divide', () => assert.equal(expressionAfter('5/-3'), '5/-3'));
  it('replaces a "×−" pair with a new operator', () => assert.equal(expressionAfter('5*-+'), '5+'));
  it('replaces plus with minus', () => assert.equal(expressionAfter('5+-'), '5-'));
  it('drops a trailing decimal point before an operator', () => assert.equal(expressionAfter('5.+'), '5+'));
  it('ignores invalid operator values', () => {
    const { state } = applyAction(INITIAL_STATE, { type: ActionType.OPERATOR, value: '%' });
    assert.equal(state, INITIAL_STATE);
  });
});

describe('calculator-state: parentheses', () => {
  it('opens and closes groups', () => assert.equal(expressionAfter('(2+3)'), '(2+3)'));
  it('inserts × before "(" after a number', () => assert.equal(expressionAfter('2(3)'), '2*(3)'));
  it('inserts × between groups', () => assert.equal(expressionAfter('(2)(3)'), '(2)*(3)'));
  it('inserts × before a number after ")"', () => assert.equal(expressionAfter('(2)3'), '(2)*3'));
  it('inserts × before a decimal after ")"', () => assert.equal(expressionAfter('(2).5'), '(2)*0.5'));
  it('allows a minus after "("', () => assert.equal(expressionAfter('(-2)'), '(-2)'));
  it('ignores a binary operator after "("', () => assert.equal(expressionAfter('(*2'), '(2'));
  it('ignores ")" without a matching "("', () => assert.equal(expressionAfter('2)'), '2'));
  it('ignores ")" right after an operator', () => assert.equal(expressionAfter('(2+)'), '(2+'));
  it('ignores ")" right after "("', () => assert.equal(expressionAfter('()'), '('));
  it('drops a trailing decimal point before ")"', () => assert.equal(expressionAfter('(2.)'), '(2)'));
});

describe('calculator-state: equals', () => {
  it('evaluates and records the calculation', () => {
    const { state, completed } = press('2+3*4=');
    assert.equal(state.expression, '14');
    assert.equal(state.previousExpression, '2+3*4');
    assert.equal(state.justEvaluated, true);
    assert.deepEqual(completed, [{ expression: '2+3*4', result: '14' }]);
  });

  it('auto-closes open parentheses', () => {
    const { state, completed } = press('2*(3+4=');
    assert.equal(state.expression, '14');
    assert.deepEqual(completed, [{ expression: '2*(3+4)', result: '14' }]);
  });

  it('drops a trailing decimal point', () => {
    assert.deepEqual(press('5.=').completed, [{ expression: '5', result: '5' }]);
  });

  it('does nothing on an empty expression', () => {
    const { state, completed } = press('=');
    assert.equal(state, INITIAL_STATE);
    assert.deepEqual(completed, []);
  });

  it('does not repeat when pressed twice', () => assert.equal(press('2+3==').completed.length, 1));

  it('reports division by zero and keeps the expression for editing', () => {
    const { state, completed } = press('5/0=');
    assert.equal(state.errorCode, ErrorCode.DIVISION_BY_ZERO);
    assert.equal(state.expression, '5/0');
    assert.deepEqual(completed, []);
  });

  it('reports an incomplete expression', () => {
    assert.equal(press('5+=').state.errorCode, ErrorCode.INCOMPLETE_EXPRESSION);
  });

  it('clears the error on the next edit', () => {
    const { state } = press('5/0=<2=');
    assert.equal(state.errorCode, null);
    assert.equal(state.expression, '2.5');
  });

  it('rethrows unexpected (non-calculation) errors', () => {
    const broken = { ...INITIAL_STATE, expression: { slice: () => { throw new TypeError('boom'); } } };
    assert.throws(() => applyAction(broken, { type: ActionType.EQUALS }), TypeError);
  });
});

describe('calculator-state: after a result', () => {
  it('starts a new number when a digit is pressed', () => assert.equal(expressionAfter('2+3=7'), '7'));
  it('starts fresh on a decimal point', () => assert.equal(expressionAfter('2+3=.'), '0.'));
  it('starts fresh on "("', () => assert.equal(expressionAfter('2+3=('), '('));
  it('continues from the result with an operator', () => assert.equal(expressionAfter('2+3=*2'), '5*2'));
  it('continues from a negative result', () => assert.equal(expressionAfter('2-5=-1'), '-3-1'));
  it('ignores ")" after a result', () => assert.equal(expressionAfter('(2=)'), '2'));
  it('chains calculations', () => {
    const { state, completed } = press('2+3=*2=');
    assert.equal(state.expression, '10');
    assert.equal(completed.length, 2);
  });
  it('clears everything on backspace', () => assert.equal(press('2+3=<').state, INITIAL_STATE));
});

describe('calculator-state: backspace and clear', () => {
  it('removes the last character', () => assert.equal(expressionAfter('123<'), '12'));
  it('stays empty on an empty expression', () => assert.equal(press('<').state, INITIAL_STATE));
  it('removes a dangling exponent', () => {
    const start = { ...INITIAL_STATE, expression: '1e+2' };
    assert.equal(press('<', start).state.expression, '1');
  });
  it('clears everything', () => assert.equal(press('12+3C').state, INITIAL_STATE));
  it('clears an error state', () => assert.equal(press('5/0=C').state, INITIAL_STATE));
});

describe('calculator-state: length limit', () => {
  it('refuses input beyond the limit and reports it', () => {
    const { state } = press('1'.repeat(MAX_EXPRESSION_LENGTH + 5));
    assert.equal(state.expression.length, MAX_EXPRESSION_LENGTH);
    assert.equal(state.errorCode, ErrorCode.EXPRESSION_TOO_LONG);
  });

  it('accepts input again after deleting', () => {
    const { state } = press(`${'1'.repeat(MAX_EXPRESSION_LENGTH + 1)}<2`);
    assert.equal(state.expression.length, MAX_EXPRESSION_LENGTH);
    assert.equal(state.errorCode, null);
  });
});

describe('calculator-state: load result', () => {
  it('loads a valid stored calculation', () => {
    const { state } = applyAction(INITIAL_STATE, { type: ActionType.LOAD_RESULT, expression: '2+3', result: '5' });
    assert.deepEqual(state, { expression: '5', previousExpression: '2+3', justEvaluated: true, errorCode: null });
  });

  it('ignores tampered values', (t) => {
    t.mock.method(console, 'warn', () => {});
    const action = { type: ActionType.LOAD_RESULT, expression: '2+3', result: '<img src=x onerror=alert(1)>' };
    assert.equal(applyAction(INITIAL_STATE, action).state, INITIAL_STATE);
    assert.equal(console.warn.mock.callCount(), 1);
  });
});

describe('calculator-state: unknown actions', () => {
  it('ignores and logs unknown action types', (t) => {
    t.mock.method(console, 'warn', () => {});
    assert.equal(applyAction(INITIAL_STATE, { type: 'explode' }).state, INITIAL_STATE);
    assert.equal(applyAction(INITIAL_STATE, null).state, INITIAL_STATE);
    assert.equal(console.warn.mock.callCount(), 2);
  });
});

describe('getPreviewResult', () => {
  const previewAfter = (sequence) => getPreviewResult(press(sequence).state);

  it('previews a valid expression', () => assert.equal(previewAfter('2+3'), '5'));
  it('previews with auto-closed parentheses', () => assert.equal(previewAfter('2*(3+4'), '14'));
  it('returns null for a lone number', () => assert.equal(previewAfter('42'), null));
  it('returns null for a lone negative number', () => assert.equal(previewAfter('-42'), null));
  it('returns null for an exponent number', () => {
    assert.equal(getPreviewResult({ ...INITIAL_STATE, expression: '1e-7' }), null);
  });
  it('returns null for an incomplete expression', () => assert.equal(previewAfter('2+'), null));
  it('returns null when dividing by zero', () => assert.equal(previewAfter('2/0'), null));
  it('returns null right after a result', () => assert.equal(previewAfter('2+3='), null));
  it('returns null while an error is shown', () => assert.equal(previewAfter('5+='), null));
});
