/**
 * Canonical expression syntax shared by the engine, the input state machine
 * and history validation.
 *
 * Expressions are stored with ASCII operators (+ - * /), "." as the decimal
 * separator and, for very large or small results, an exponent ("1e+21").
 * The Spanish display format (× ÷ − and decimal comma) is applied only when
 * rendering; see number-format.js.
 */

export const OPERATORS = Object.freeze(['+', '-', '*', '/']);

/** Regex source for an unsigned number: "12", "12.", "12.5", ".5", "1e+21". */
export const NUMBER_SOURCE = String.raw`(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;

/** Upper bound for any expression we accept from storage or produce on "=". */
export const MAX_STORED_EXPRESSION_LENGTH = 200;

const CANONICAL_NUMBER = new RegExp(`^-?${NUMBER_SOURCE}$`);
const CANONICAL_EXPRESSION_CHARACTERS = /^[0-9.e+\-*/()]+$/;

export function isOperator(character) {
  return OPERATORS.includes(character);
}

export function isDigit(character) {
  return typeof character === 'string' && character.length === 1 && character >= '0' && character <= '9';
}

/** True for a number string such as "-12.5" or "1e-7" (no operators). */
export function isCanonicalNumber(value) {
  return typeof value === 'string' && CANONICAL_NUMBER.test(value);
}

/** Cheap structural check used to reject tampered or corrupt stored data. */
export function isCanonicalExpression(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_STORED_EXPRESSION_LENGTH &&
    CANONICAL_EXPRESSION_CHARACTERS.test(value)
  );
}
