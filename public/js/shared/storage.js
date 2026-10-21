import { logger } from './logger.js';

/**
 * Wraps Web Storage so callers never crash when it is unavailable (private
 * mode, blocked cookies, quota exceeded) or holds corrupt data. Every method
 * degrades to a harmless fallback and logs a warning for developers.
 *
 * @param {() => Storage} getBackend Lazily returns the storage; may throw.
 */
export function createSafeStorage(getBackend) {
  let backend = null;
  try {
    backend = getBackend() ?? null;
  } catch (error) {
    logger.warn('Storage is unavailable; data will not persist.', error);
  }

  function getItem(key) {
    if (!backend) return null;
    try {
      return backend.getItem(key);
    } catch (error) {
      logger.warn(`Could not read "${key}" from storage.`, error);
      return null;
    }
  }

  /** @returns {boolean} Whether the value was saved. */
  function setItem(key, value) {
    if (!backend) return false;
    try {
      backend.setItem(key, value);
      return true;
    } catch (error) {
      logger.warn(`Could not save "${key}" to storage.`, error);
      return false;
    }
  }

  function removeItem(key) {
    if (!backend) return;
    try {
      backend.removeItem(key);
    } catch (error) {
      logger.warn(`Could not remove "${key}" from storage.`, error);
    }
  }

  function readJson(key, fallback) {
    const raw = getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      logger.warn(`Ignoring corrupt JSON in "${key}".`, error);
      return fallback;
    }
  }

  const writeJson = (key, value) => setItem(key, JSON.stringify(value));

  return Object.freeze({ getItem, setItem, removeItem, readJson, writeJson });
}
