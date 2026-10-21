import { ActionType, INITIAL_STATE, applyAction } from '../../public/js/core/calculator-state.js';

const SYMBOL_ACTIONS = {
  '.': { type: ActionType.DECIMAL },
  '(': { type: ActionType.OPEN_PAREN },
  ')': { type: ActionType.CLOSE_PAREN },
  '=': { type: ActionType.EQUALS },
  '<': { type: ActionType.BACKSPACE },
  C: { type: ActionType.CLEAR },
};

/** Maps one test symbol to a calculator action ("<" = backspace, "C" = clear). */
export function actionFor(symbol) {
  if (/^[0-9]$/.test(symbol)) return { type: ActionType.DIGIT, value: symbol };
  if ('+-*/'.includes(symbol)) return { type: ActionType.OPERATOR, value: symbol };
  const action = SYMBOL_ACTIONS[symbol];
  if (!action) throw new Error(`Unknown test symbol "${symbol}"`);
  return action;
}

/**
 * Presses each symbol in order and returns the final state plus every
 * calculation completed along the way.
 */
export function press(sequence, startState = INITIAL_STATE) {
  let state = startState;
  const completed = [];
  for (const symbol of sequence) {
    const outcome = applyAction(state, actionFor(symbol));
    state = outcome.state;
    if (outcome.completedCalculation) completed.push(outcome.completedCalculation);
  }
  return { state, completed };
}
