import { CalculationError, ErrorCode } from './errors.js';

/** Guards against stack exhaustion from deeply nested input like "((((…". */
export const MAX_NESTING_DEPTH = 100;

/**
 * Evaluates tokens with a recursive-descent parser (no eval/Function).
 *
 * Grammar (standard precedence, left-associative):
 *   expression := term (('+' | '-') term)*
 *   term       := unary (('*' | '/') unary)*
 *   unary      := ('+' | '-') unary | primary
 *   primary    := number | '(' expression ')'
 *
 * @param {import('./tokenizer.js').Token[]} tokens
 * @returns {number} Raw (unrounded) result; may be non-finite on overflow.
 * @throws {CalculationError}
 */
export function evaluateTokens(tokens) {
  let position = 0;
  let depth = 0;

  const peek = () => tokens[position];
  const advance = () => tokens[position++];
  const isOperatorToken = (token, ...operators) =>
    token?.type === 'operator' && operators.includes(token.value);

  function enterNesting() {
    depth += 1;
    if (depth > MAX_NESTING_DEPTH) {
      throw new CalculationError(ErrorCode.EXPRESSION_TOO_COMPLEX, `Nesting deeper than ${MAX_NESTING_DEPTH}`);
    }
  }

  function parseExpression() {
    let value = parseTerm();
    while (isOperatorToken(peek(), '+', '-')) {
      const operator = advance().value;
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (isOperatorToken(peek(), '*', '/')) {
      const operator = advance().value;
      const right = parseUnary();
      if (operator === '/' && right === 0) {
        throw new CalculationError(ErrorCode.DIVISION_BY_ZERO);
      }
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }

  function parseUnary() {
    if (!isOperatorToken(peek(), '+', '-')) {
      return parsePrimary();
    }
    const operator = advance().value;
    enterNesting();
    const operand = parseUnary();
    depth -= 1;
    return operator === '-' ? -operand : operand;
  }

  function parsePrimary() {
    const token = advance();

    // Missing operand: "5+", "(" or "()".
    if (token === undefined || (token.type === 'paren' && token.value === ')')) {
      throw new CalculationError(ErrorCode.INCOMPLETE_EXPRESSION);
    }
    if (token.type === 'number') {
      return token.value;
    }
    if (token.type === 'paren') {
      enterNesting();
      const value = parseExpression();
      const closing = advance();
      if (closing === undefined) {
        throw new CalculationError(ErrorCode.MISMATCHED_PARENTHESES, 'Unclosed "("');
      }
      if (closing.type !== 'paren' || closing.value !== ')') {
        throw new CalculationError(ErrorCode.INVALID_EXPRESSION, 'Expected ")"');
      }
      depth -= 1;
      return value;
    }
    throw new CalculationError(ErrorCode.INVALID_EXPRESSION, `Unexpected operator "${token.value}"`);
  }

  if (tokens.length === 0) {
    throw new CalculationError(ErrorCode.INCOMPLETE_EXPRESSION, 'Empty expression');
  }

  const result = parseExpression();

  if (position < tokens.length) {
    const leftover = tokens[position];
    const code =
      leftover.type === 'paren' && leftover.value === ')'
        ? ErrorCode.MISMATCHED_PARENTHESES
        : ErrorCode.INVALID_EXPRESSION;
    throw new CalculationError(code, `Unexpected token at position ${position}`);
  }

  return result;
}
