import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculate } from '../../public/js/core/calculate.js';
import { ErrorCode } from '../../public/js/core/errors.js';
import { MAX_NESTING_DEPTH } from '../../public/js/core/parser.js';

/** Asserts that calculate() throws a CalculationError with the given code. */
function assertCalculationError(expression, code) {
  assert.throws(() => calculate(expression), { name: 'CalculationError', code });
}

describe('calculate: basic operations', () => {
  const cases = [
    ['2+3', 5],
    ['10-4', 6],
    ['6*7', 42],
    ['20/4', 5],
    ['7/2', 3.5],
    ['42', 42],
    ['0', 0],
  ];
  for (const [expression, expected] of cases) {
    it(`${expression} = ${expected}`, () => assert.equal(calculate(expression), expected));
  }
});

describe('calculate: precedence and associativity', () => {
  it('multiplies before adding', () => assert.equal(calculate('2+3*4'), 14));
  it('divides before subtracting', () => assert.equal(calculate('10-6/2'), 7));
  it('subtraction is left-associative', () => assert.equal(calculate('10-3-2'), 5));
  it('division is left-associative', () => assert.equal(calculate('100/10/5'), 2));
  it('parentheses override precedence', () => assert.equal(calculate('(2+3)*4'), 20));
  it('supports nested parentheses', () => assert.equal(calculate('2*((1+2)*(3+4))'), 42));
  it('ignores spaces', () => assert.equal(calculate(' 2 + 3 * 4 '), 14));
});

describe('calculate: decimals', () => {
  it('adds decimals', () => assert.equal(calculate('1.5+2.25'), 3.75));
  it('hides floating-point noise', () => assert.equal(calculate('0.1+0.2'), 0.3));
  it('hides noise in multiplication', () => assert.equal(calculate('1.1*1.1'), 1.21));
  it('accepts a leading decimal point', () => assert.equal(calculate('.5*2'), 1));
  it('accepts a trailing decimal point', () => assert.equal(calculate('5.+1'), 6));
  it('hides noise in sums that land just below a value', () => assert.equal(calculate('0.1+0.7'), 0.8));
  it('rounds repeating decimals to 15 significant digits', () => assert.equal(calculate('1/3'), 0.333333333333333));
  it('keeps 15-digit integers exact', () => assert.equal(calculate('123456789012345+0'), 123456789012345));
  it('accepts exponent notation from previous results', () => assert.equal(calculate('1e+21*2'), 2e21));
  it('accepts negative exponents', () => assert.equal(calculate('1e-7*10'), 0.000001));
});

describe('calculate: negative numbers', () => {
  it('handles a leading minus', () => assert.equal(calculate('-5+3'), -2));
  it('handles minus after an operator', () => assert.equal(calculate('5*-3'), -15));
  it('handles minus after "("', () => assert.equal(calculate('(-2)*(-3)'), 6));
  it('negates a parenthesised group', () => assert.equal(calculate('-(2+3)'), -5));
  it('handles double negation', () => assert.equal(calculate('5--3'), 8));
  it('handles unary plus', () => assert.equal(calculate('+5'), 5));
  it('normalises negative zero to zero', () => assert.ok(Object.is(calculate('-0*5'), 0)));
});

describe('calculate: errors', () => {
  it('rejects division by zero', () => assertCalculationError('5/0', ErrorCode.DIVISION_BY_ZERO));
  it('rejects zero divided by zero', () => assertCalculationError('0/0', ErrorCode.DIVISION_BY_ZERO));
  it('rejects division by an expression equal to zero', () =>
    assertCalculationError('1/(2-2)', ErrorCode.DIVISION_BY_ZERO));
  it('rejects an empty expression', () => assertCalculationError('', ErrorCode.INCOMPLETE_EXPRESSION));
  it('rejects a trailing operator', () => assertCalculationError('5+', ErrorCode.INCOMPLETE_EXPRESSION));
  it('rejects empty parentheses', () => assertCalculationError('()', ErrorCode.INCOMPLETE_EXPRESSION));
  it('rejects an unclosed parenthesis', () => assertCalculationError('(5+2', ErrorCode.MISMATCHED_PARENTHESES));
  it('rejects an extra closing parenthesis', () => assertCalculationError('5+2)', ErrorCode.MISMATCHED_PARENTHESES));
  it('rejects consecutive binary operators', () => assertCalculationError('5*/2', ErrorCode.INVALID_EXPRESSION));
  it('rejects adjacent groups without operator', () => assertCalculationError('(1)(2)', ErrorCode.INVALID_EXPRESSION));
  it('rejects letters and code', () => assertCalculationError('alert(1)', ErrorCode.INVALID_EXPRESSION));
  it('rejects a dangling exponent', () => assertCalculationError('1e+', ErrorCode.INVALID_EXPRESSION));
  it('rejects non-string input', () => assert.throws(() => calculate(42), { code: ErrorCode.INVALID_EXPRESSION }));
  it('rejects overflow to infinity', () => assertCalculationError('1e308*10', ErrorCode.RESULT_OUT_OF_RANGE));
  it('rejects huge literals', () => assertCalculationError('1e999', ErrorCode.RESULT_OUT_OF_RANGE));

  it('accepts nesting up to the limit', () => {
    const depth = MAX_NESTING_DEPTH;
    assert.equal(calculate('('.repeat(depth) + '1' + ')'.repeat(depth)), 1);
  });

  it('rejects nesting beyond the limit instead of overflowing the stack', () => {
    const depth = MAX_NESTING_DEPTH + 1;
    assertCalculationError('('.repeat(depth) + '1' + ')'.repeat(depth), ErrorCode.EXPRESSION_TOO_COMPLEX);
  });

  it('rejects long chains of unary minus beyond the limit', () => {
    assertCalculationError('-'.repeat(MAX_NESTING_DEPTH + 1) + '1', ErrorCode.EXPRESSION_TOO_COMPLEX);
  });
});
