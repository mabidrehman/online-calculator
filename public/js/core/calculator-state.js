import { calculate } from './calculate.js';
import { CalculationError, ErrorCode } from './errors.js';
import { toCanonicalNumber } from './number-format.js';
import { NUMBER_SOURCE, isCanonicalExpression, isCanonicalNumber, isDigit, isOperator } from './syntax.js';
import { logger } from '../shared/logger.js';

/**
 * Pure state machine for calculator input. Every action returns a new state;
 * nothing here touches the DOM, so the rules are fully unit-testable.
 */

export const MAX_EXPRESSION_LENGTH = 100;

export const ActionType = Object.freeze({
  DIGIT: 'digit',
  DECIMAL: 'decimal',
  OPERATOR: 'operator',
  OPEN_PAREN: 'openParen',
  CLOSE_PAREN: 'closeParen',
  BACKSPACE: 'backspace',
  CLEAR: 'clear',
  EQUALS: 'equals',
  LOAD_RESULT: 'loadResult',
});

/**
 * @typedef {object} CalculatorState
 * @property {string} expression Canonical expression being edited, or the last result.
 * @property {string | null} previousExpression The expression that produced the result.
 * @property {boolean} justEvaluated True right after "=" (or loading a history entry).
 * @property {string | null} errorCode ErrorCode to show, if any.
 */

/** @type {CalculatorState} */
export const INITIAL_STATE = Object.freeze({
  expression: '',
  previousExpression: null,
  justEvaluated: false,
  errorCode: null,
});

const TRAILING_NUMBER = new RegExp(`${NUMBER_SOURCE}$`);
const DANGLING_EXPONENT = /e[+-]?$/;

const lastCharacter = (text) => text.at(-1) ?? '';
const trailingNumber = (expression) => TRAILING_NUMBER.exec(expression)?.[0] ?? '';
const stripTrailingDecimal = (expression) => (expression.endsWith('.') ? expression.slice(0, -1) : expression);

/** True when the expression ends in something an operator can follow. */
function endsWithOperand(expression) {
  const last = lastCharacter(expression);
  return isDigit(last) || last === '.' || last === ')';
}

/** A minus is unary when it starts the expression or follows an operator or "(". */
function isUnaryMinusAt(expression, index) {
  if (expression[index] !== '-') return false;
  const previous = expression[index - 1];
  return previous === undefined || previous === '(' || isOperator(previous);
}

function countUnclosedParentheses(expression) {
  let open = 0;
  for (const character of expression) {
    if (character === '(') open += 1;
    else if (character === ')') open -= 1;
  }
  return Math.max(open, 0);
}

/** Prepares an expression for evaluation: drops a trailing "." and closes open groups. */
function completeExpression(expression) {
  const trimmed = stripTrailingDecimal(expression);
  return trimmed + ')'.repeat(countUnclosedParentheses(trimmed));
}

/** Commits an edited expression, enforcing the length limit. */
function withExpression(state, expression) {
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    return { ...state, errorCode: ErrorCode.EXPRESSION_TOO_LONG };
  }
  return { expression, previousExpression: null, justEvaluated: false, errorCode: null };
}

/** New operands replace a just-shown result instead of appending to it. */
const editableExpression = (state) => (state.justEvaluated ? '' : state.expression);

function inputDigit(state, digit) {
  if (!isDigit(digit)) return state;
  const expression = editableExpression(state);

  // Avoid leading zeros: "0" followed by "5" becomes "5".
  if (trailingNumber(expression) === '0') {
    return withExpression(state, expression.slice(0, -1) + digit);
  }
  const implicitMultiply = lastCharacter(expression) === ')' ? '*' : '';
  return withExpression(state, expression + implicitMultiply + digit);
}

function inputDecimal(state) {
  const expression = editableExpression(state);
  const number = trailingNumber(expression);

  if (number.includes('.') || number.includes('e')) return state;
  if (number) return withExpression(state, `${expression}.`);

  const implicitMultiply = lastCharacter(expression) === ')' ? '*' : '';
  return withExpression(state, `${expression}${implicitMultiply}0.`);
}

function inputOperator(state, operator) {
  if (!isOperator(operator)) return state;

  // Operators continue from a shown result, so keep state.expression as is.
  const expression = stripTrailingDecimal(state.expression);
  const last = lastCharacter(expression);

  // Only a unary minus may start an expression or a group.
  if (expression === '' || last === '(') {
    return operator === '-' ? withExpression(state, `${expression}-`) : state;
  }

  if (!isOperator(last)) {
    return withExpression(state, expression + operator);
  }

  const lastIndex = expression.length - 1;
  if (isUnaryMinusAt(expression, lastIndex)) {
    const beforeMinus = expression.slice(0, -1);
    // "-" after "(" or at the start cannot become a binary operator.
    if (operator === '-' || beforeMinus === '' || lastCharacter(beforeMinus) === '(') return state;
    // "5×−" then "+" → "5+": replace the whole operator pair.
    return withExpression(state, beforeMinus.slice(0, -1) + operator);
  }

  // "5×" then "−" starts a negative operand: "5×−3".
  if (operator === '-' && (last === '*' || last === '/')) {
    return withExpression(state, `${expression}-`);
  }

  // Otherwise the new operator replaces the previous one.
  return withExpression(state, expression.slice(0, -1) + operator);
}

function inputOpenParen(state) {
  const expression = stripTrailingDecimal(editableExpression(state));
  const implicitMultiply = endsWithOperand(expression) ? '*' : '';
  return withExpression(state, `${expression}${implicitMultiply}(`);
}

function inputCloseParen(state) {
  if (state.justEvaluated) return state;
  const expression = stripTrailingDecimal(state.expression);
  const last = lastCharacter(expression);

  if (countUnclosedParentheses(expression) === 0) return state;
  if (!isDigit(last) && last !== ')') return state;
  return withExpression(state, `${expression})`);
}

function backspace(state) {
  if (state.justEvaluated) return INITIAL_STATE;
  if (state.expression === '') return INITIAL_STATE;
  // Never leave a half exponent such as "1e+" behind.
  const expression = state.expression.slice(0, -1).replace(DANGLING_EXPONENT, '');
  return withExpression(state, expression);
}

function evaluate(state) {
  if (state.justEvaluated || state.expression === '') {
    return { state, completedCalculation: null };
  }

  const expression = completeExpression(state.expression);
  try {
    const result = toCanonicalNumber(calculate(expression));
    return {
      state: { expression: result, previousExpression: expression, justEvaluated: true, errorCode: null },
      completedCalculation: { expression, result },
    };
  } catch (error) {
    if (!(error instanceof CalculationError)) throw error;
    return { state: { ...state, errorCode: error.code }, completedCalculation: null };
  }
}

/** Shows a stored calculation (e.g. from history) as the current result. */
function loadResult(state, { expression, result }) {
  if (!isCanonicalNumber(result) || !isCanonicalExpression(expression)) {
    logger.warn('Ignoring invalid calculation to load', { expression, result });
    return state;
  }
  return { expression: result, previousExpression: expression, justEvaluated: true, errorCode: null };
}

/**
 * Applies one user action.
 * @param {CalculatorState} state
 * @param {{ type: string, value?: string, expression?: string, result?: string }} action
 * @returns {{ state: CalculatorState, completedCalculation: { expression: string, result: string } | null }}
 */
export function applyAction(state, action) {
  switch (action?.type) {
    case ActionType.EQUALS:
      return evaluate(state);
    case ActionType.DIGIT:
      return { state: inputDigit(state, action.value), completedCalculation: null };
    case ActionType.DECIMAL:
      return { state: inputDecimal(state), completedCalculation: null };
    case ActionType.OPERATOR:
      return { state: inputOperator(state, action.value), completedCalculation: null };
    case ActionType.OPEN_PAREN:
      return { state: inputOpenParen(state), completedCalculation: null };
    case ActionType.CLOSE_PAREN:
      return { state: inputCloseParen(state), completedCalculation: null };
    case ActionType.BACKSPACE:
      return { state: backspace(state), completedCalculation: null };
    case ActionType.CLEAR:
      return { state: INITIAL_STATE, completedCalculation: null };
    case ActionType.LOAD_RESULT:
      return { state: loadResult(state, action), completedCalculation: null };
    default:
      logger.warn('Ignoring unknown calculator action', action);
      return { state, completedCalculation: null };
  }
}

/**
 * Live result shown while typing ("2+3" → "5"), or null when there is
 * nothing new to show or the expression is not yet valid.
 * @param {CalculatorState} state
 * @returns {string | null}
 */
export function getPreviewResult(state) {
  if (state.justEvaluated || state.errorCode) return null;

  const expression = completeExpression(state.expression);
  // A lone number (optionally negative) has nothing to preview.
  if (!/[+\-*/]/.test(expression.slice(1).replace(/e[+-]/g, ''))) return null;

  try {
    return toCanonicalNumber(calculate(expression));
  } catch (error) {
    if (error instanceof CalculationError) return null;
    throw error;
  }
}
