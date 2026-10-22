import { ActionType, INITIAL_STATE, applyAction, getPreviewResult } from './core/calculator-state.js';
import { createHistory } from './features/history.js';
import { keyToAction } from './features/keyboard.js';
import { createThemeController } from './features/themes.js';
import { createSafeStorage } from './shared/storage.js';
import { HISTORY_INDEX_ATTRIBUTE, createHistoryView } from './ui/history-view.js';
import { createCalculatorView } from './ui/calculator-view.js';
import { renderThemePicker } from './ui/theme-picker.js';

const PRESSED_CLASS = 'is-pressed';
const PRESSED_FEEDBACK_MS = 120;

/** Elements where Enter/Space must keep their native behaviour. */
const ACTIVATABLE_SELECTOR = 'button, a, input, select, textarea, summary';

/** Finds a required element or fails loudly with a developer-friendly message. */
function requireElement(document, id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element #${id}`);
  return element;
}

function queryElements(document) {
  return {
    keypad: requireElement(document, 'keypad'),
    displaySecondary: requireElement(document, 'display-secondary'),
    displayPrimary: requireElement(document, 'display-primary'),
    displayError: requireElement(document, 'display-error'),
    historyList: requireElement(document, 'history-list'),
    historyEmpty: requireElement(document, 'history-empty'),
    historyClear: requireElement(document, 'history-clear'),
    themeSelect: requireElement(document, 'theme-select'),
  };
}

/** Reads the action a keypad button represents from its data attributes. */
function actionFromButton(button) {
  const { action, value } = button.dataset;
  return value === undefined ? { type: action } : { type: action, value };
}

/**
 * Wires the calculator to the page. Dependencies are passed in so tests can
 * run the whole app against a simulated DOM.
 *
 * @param {{ document: Document, window: Window }} environment
 */
export function initCalculatorApp({ document, window }) {
  const elements = queryElements(document);
  const storage = createSafeStorage(() => window.localStorage);
  const history = createHistory(storage);
  const themes = createThemeController({ root: document.documentElement, storage });

  const calculatorView = createCalculatorView({
    secondary: elements.displaySecondary,
    primary: elements.displayPrimary,
    error: elements.displayError,
  });
  const historyView = createHistoryView({
    list: elements.historyList,
    emptyMessage: elements.historyEmpty,
    clearButton: elements.historyClear,
  });

  let state = INITIAL_STATE;

  function dispatch(action) {
    const outcome = applyAction(state, action);
    state = outcome.state;
    if (outcome.completedCalculation && history.add(outcome.completedCalculation)) {
      historyView.render(history.getEntries());
    }
    calculatorView.render(state, getPreviewResult(state));
  }

  /** Briefly highlights the on-screen key matching a keyboard action. */
  function flashKey(action) {
    const button = [...elements.keypad.querySelectorAll('button[data-action]')].find(
      (candidate) =>
        candidate.dataset.action === action.type &&
        (action.value === undefined || candidate.dataset.value === action.value),
    );
    if (!button) return;
    button.classList.add(PRESSED_CLASS);
    window.setTimeout(() => button.classList.remove(PRESSED_CLASS), PRESSED_FEEDBACK_MS);
  }

  elements.keypad.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button && elements.keypad.contains(button)) {
      dispatch(actionFromButton(button));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) return;
    // Enter/Space activate focused controls natively, except on the keypad,
    // where Enter must mean "=" rather than re-pressing the focused key.
    const target = event.target instanceof window.Element ? event.target : null;
    const isActivationKey = event.key === 'Enter' || event.key === ' ';
    const isOnKeypad = target !== null && elements.keypad.contains(target);
    if (isActivationKey && !isOnKeypad && target?.closest(ACTIVATABLE_SELECTOR)) return;

    const action = keyToAction(event);
    if (!action) return;
    // Stops "/" opening Firefox quick-find and Backspace navigating back.
    event.preventDefault();
    dispatch(action);
    flashKey(action);
  });

  elements.historyList.addEventListener('click', (event) => {
    const button = event.target.closest(`[${HISTORY_INDEX_ATTRIBUTE}]`);
    if (!button) return;
    const entry = history.getEntries()[Number(button.getAttribute(HISTORY_INDEX_ATTRIBUTE))];
    if (entry) dispatch({ type: ActionType.LOAD_RESULT, ...entry });
  });

  elements.historyClear.addEventListener('click', () => {
    history.clear();
    historyView.render(history.getEntries());
  });

  renderThemePicker(elements.themeSelect, {
    currentThemeId: themes.getCurrent(),
    onSelect: (themeId) => themes.setTheme(themeId),
  });

  historyView.render(history.getEntries());
  calculatorView.render(state, getPreviewResult(state));
}
