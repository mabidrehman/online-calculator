/**
 * Error codes raised by the engine and the input state machine.
 * Codes are language-neutral; shared/messages.js maps them to Spanish text.
 */
export const ErrorCode = Object.freeze({
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  INCOMPLETE_EXPRESSION: 'INCOMPLETE_EXPRESSION',
  INVALID_EXPRESSION: 'INVALID_EXPRESSION',
  MISMATCHED_PARENTHESES: 'MISMATCHED_PARENTHESES',
  RESULT_OUT_OF_RANGE: 'RESULT_OUT_OF_RANGE',
  EXPRESSION_TOO_COMPLEX: 'EXPRESSION_TOO_COMPLEX',
  EXPRESSION_TOO_LONG: 'EXPRESSION_TOO_LONG',
});

export class CalculationError extends Error {
  /**
   * @param {string} code One of ErrorCode.
   * @param {string} [detail] Developer-facing detail (never shown to users).
   */
  constructor(code, detail = code) {
    super(detail);
    this.name = 'CalculationError';
    this.code = code;
  }
}
