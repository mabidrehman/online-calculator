import { isCanonicalExpression, isCanonicalNumber } from '../core/syntax.js';
import { logger } from '../shared/logger.js';

export const HISTORY_STORAGE_KEY = 'calculadora.historial';
/** Only the latest completed calculation is kept; a new one replaces it. */
export const MAX_HISTORY_ENTRIES = 1;

/** @typedef {{ expression: string, result: string }} HistoryEntry */

/** Stored data is user-controlled, so every entry is re-validated on load. */
function isValidEntry(entry) {
  return (
    entry !== null &&
    typeof entry === 'object' &&
    isCanonicalExpression(entry.expression) &&
    isCanonicalNumber(entry.result)
  );
}

function sanitizeEntries(value, limit) {
  if (!Array.isArray(value)) {
    if (value !== null) logger.warn('Ignoring stored history that is not a list.');
    return [];
  }
  const valid = value.filter(isValidEntry);
  if (valid.length !== value.length) {
    logger.warn(`Dropped ${value.length - valid.length} invalid history entries.`);
  }
  return valid.slice(0, limit).map(({ expression, result }) => Object.freeze({ expression, result }));
}

/**
 * Calculation history, newest first, persisted in the given storage.
 * @param {ReturnType<import('../shared/storage.js').createSafeStorage>} storage
 * @param {{ limit?: number }} [options]
 */
export function createHistory(storage, { limit = MAX_HISTORY_ENTRIES } = {}) {
  let entries = Object.freeze(sanitizeEntries(storage.readJson(HISTORY_STORAGE_KEY, null), limit));

  return Object.freeze({
    /** @returns {readonly HistoryEntry[]} */
    getEntries: () => entries,

    /** @returns {boolean} Whether the entry was accepted. */
    add(entry) {
      if (!isValidEntry(entry)) {
        logger.warn('Refusing to store an invalid history entry.', entry);
        return false;
      }
      const stored = Object.freeze({ expression: entry.expression, result: entry.result });
      entries = Object.freeze([stored, ...entries].slice(0, limit));
      storage.writeJson(HISTORY_STORAGE_KEY, entries);
      return true;
    },

    clear() {
      entries = Object.freeze([]);
      storage.removeItem(HISTORY_STORAGE_KEY);
    },
  });
}
