import { formatForDisplay } from '../core/number-format.js';
import { getErrorMessage } from '../shared/messages.js';

/**
 * Renders calculator state into the display. Uses textContent only, so no
 * value can ever be interpreted as HTML.
 *
 * @param {{ secondary: HTMLElement, primary: HTMLElement, error: HTMLElement }} elements
 */
export function createCalculatorView({ secondary, primary, error }) {
  return Object.freeze({
    /**
     * @param {import('../core/calculator-state.js').CalculatorState} state
     * @param {string | null} preview
     */
    render(state, preview) {
      primary.textContent = state.expression ? formatForDisplay(state.expression) : '0';

      if (state.justEvaluated && state.previousExpression) {
        secondary.textContent = `${formatForDisplay(state.previousExpression)} =`;
      } else if (preview !== null) {
        secondary.textContent = `= ${formatForDisplay(preview)}`;
      } else {
        secondary.textContent = '';
      }

      error.textContent = state.errorCode ? getErrorMessage(state.errorCode) : '';
    },
  });
}
