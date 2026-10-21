import { formatForDisplay } from '../core/number-format.js';
import { UI_TEXT } from '../shared/messages.js';

/** Attribute linking a history button back to its entry index. */
export const HISTORY_INDEX_ATTRIBUTE = 'data-history-index';

function createEntryElement(document, entry, index) {
  const expression = formatForDisplay(entry.expression);
  const result = formatForDisplay(entry.result);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'history-entry';
  button.setAttribute(HISTORY_INDEX_ATTRIBUTE, String(index));
  button.setAttribute('aria-label', UI_TEXT.historyEntryLabel(expression, result));

  const expressionText = document.createElement('span');
  expressionText.className = 'history-entry__expression';
  expressionText.textContent = `${expression} =`;

  const resultText = document.createElement('span');
  resultText.className = 'history-entry__result';
  resultText.textContent = result;

  button.append(expressionText, resultText);

  const item = document.createElement('li');
  item.append(button);
  return item;
}

/**
 * Renders history entries as buttons. Built with DOM APIs and textContent,
 * never innerHTML, so stored values cannot inject markup.
 *
 * @param {{ list: HTMLElement, emptyMessage: HTMLElement, clearButton: HTMLButtonElement }} elements
 */
export function createHistoryView({ list, emptyMessage, clearButton }) {
  const document = list.ownerDocument;

  return Object.freeze({
    /** @param {readonly import('../features/history.js').HistoryEntry[]} entries */
    render(entries) {
      list.replaceChildren(...entries.map((entry, index) => createEntryElement(document, entry, index)));
      const isEmpty = entries.length === 0;
      list.hidden = isEmpty;
      emptyMessage.hidden = !isEmpty;
      clearButton.disabled = isEmpty;
    },
  });
}
