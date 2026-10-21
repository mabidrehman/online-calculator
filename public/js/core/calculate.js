import { CalculationError, ErrorCode } from './errors.js';
import { roundToSignificantDigits } from './number-format.js';
import { evaluateTokens } from './parser.js';
import { tokenize } from './tokenizer.js';

/**
 * Evaluates a canonical expression ("2*(3+4)") and returns a rounded result.
 * @param {string} expression
 * @returns {number}
 * @throws {CalculationError}
 */
export function calculate(expression) {
  const value = evaluateTokens(tokenize(expression));
  if (!Number.isFinite(value)) {
    throw new CalculationError(ErrorCode.RESULT_OUT_OF_RANGE);
  }
  return roundToSignificantDigits(value);
}
