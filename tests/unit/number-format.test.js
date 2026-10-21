import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatForDisplay,
  roundToSignificantDigits,
  toCanonicalNumber,
} from '../../public/js/core/number-format.js';
import { isCanonicalExpression, isCanonicalNumber } from '../../public/js/core/syntax.js';

describe('number-format', () => {
  it('rounds away floating-point noise', () => assert.equal(roundToSignificantDigits(0.1 + 0.2), 0.3));
  it('keeps integers intact', () => assert.equal(roundToSignificantDigits(123456789), 123456789));
  it('turns -0 into 0', () => assert.ok(Object.is(roundToSignificantDigits(-0), 0)));

  it('produces canonical strings that round-trip', () => {
    assert.equal(toCanonicalNumber(-1.5), '-1.5');
    assert.equal(toCanonicalNumber(1e21), '1e+21');
    assert.equal(toCanonicalNumber(1e-7), '1e-7');
  });

  it('formats operators and decimals the Spanish way', () => {
    assert.equal(formatForDisplay('-1.5*2/4+3'), '−1,5×2÷4+3');
  });

  it('leaves digits and parentheses untouched', () => assert.equal(formatForDisplay('(12)'), '(12)'));
});

describe('syntax validators', () => {
  it('accepts canonical numbers', () => {
    for (const value of ['0', '-12', '3.5', '.5', '1e+21', '-1e-7']) {
      assert.ok(isCanonicalNumber(value), value);
    }
  });

  it('rejects non-numbers', () => {
    for (const value of ['', '-', '1+1', 'abc', '1e', '<img>', 5, null]) {
      assert.ok(!isCanonicalNumber(value), String(value));
    }
  });

  it('accepts canonical expressions', () => assert.ok(isCanonicalExpression('-(1.5+2)*3/4')));

  it('rejects markup, empty and oversized expressions', () => {
    assert.ok(!isCanonicalExpression('<script>alert(1)</script>'));
    assert.ok(!isCanonicalExpression(''));
    assert.ok(!isCanonicalExpression('1'.repeat(201)));
    assert.ok(!isCanonicalExpression({}));
  });
});
