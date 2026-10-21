import { CalculationError, ErrorCode } from './errors.js';
import { NUMBER_SOURCE, isOperator } from './syntax.js';

/**
 * @typedef {{ type: 'number', value: number }
 *   | { type: 'operator', value: '+' | '-' | '*' | '/' }
 *   | { type: 'paren', value: '(' | ')' }} Token
 */

/**
 * Splits a canonical expression into tokens.
 * @param {string} expression
 * @returns {Token[]}
 * @throws {CalculationError} INVALID_EXPRESSION on unknown characters.
 */
export function tokenize(expression) {
  if (typeof expression !== 'string') {
    throw new CalculationError(ErrorCode.INVALID_EXPRESSION, 'Expression must be a string');
  }

  // A fresh sticky regex per call keeps tokenize() re-entrant.
  const numberPattern = new RegExp(NUMBER_SOURCE, 'y');
  const tokens = [];
  let index = 0;

  while (index < expression.length) {
    const character = expression[index];

    if (character === ' ') {
      index += 1;
      continue;
    }

    numberPattern.lastIndex = index;
    const numberMatch = numberPattern.exec(expression);
    if (numberMatch) {
      tokens.push({ type: 'number', value: Number(numberMatch[0]) });
      index += numberMatch[0].length;
      continue;
    }

    if (isOperator(character)) {
      tokens.push({ type: 'operator', value: character });
    } else if (character === '(' || character === ')') {
      tokens.push({ type: 'paren', value: character });
    } else {
      throw new CalculationError(
        ErrorCode.INVALID_EXPRESSION,
        `Unexpected character "${character}" at position ${index}`,
      );
    }
    index += 1;
  }

  return tokens;
}
