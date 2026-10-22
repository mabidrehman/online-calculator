import { logger } from '../shared/logger.js';

/**
 * Must match the key read by js/theme-boot.js, which applies the saved theme
 * before first paint (a test enforces this).
 */
export const THEME_STORAGE_KEY = 'calculadora.tema';

/**
 * Attribute on <html> holding the selected theme. css/themes.css scopes the
 * theme tokens to the calculator, so the rest of the page is unaffected.
 */
export const THEME_ATTRIBUTE = 'data-calculator-theme';

/** Each id has a matching [data-calculator-theme="id"] block in css/themes.css. */
export const THEMES = Object.freeze([
  { id: 'claro', label: 'Claro' },
  { id: 'oscuro', label: 'Oscuro' },
  { id: 'azul', label: 'Azul' },
  { id: 'verde', label: 'Verde' },
  { id: 'lavanda', label: 'Lavanda' },
  { id: 'alto-contraste', label: 'Alto contraste' },
]);

export const DEFAULT_THEME_ID = 'claro';

export function isThemeId(id) {
  return THEMES.some((theme) => theme.id === id);
}

/**
 * Applies and persists the calculator theme via THEME_ATTRIBUTE on `root`.
 * The initial theme is whatever theme-boot.js already applied, if valid.
 *
 * @param {{ root: HTMLElement, storage: ReturnType<import('../shared/storage.js').createSafeStorage> }} deps
 */
export function createThemeController({ root, storage }) {
  const applied = root.getAttribute(THEME_ATTRIBUTE);
  let current = isThemeId(applied) ? applied : DEFAULT_THEME_ID;
  root.setAttribute(THEME_ATTRIBUTE, current);

  return Object.freeze({
    getCurrent: () => current,

    /** @returns {boolean} Whether the theme was applied. */
    setTheme(id) {
      if (!isThemeId(id)) {
        logger.warn('Ignoring unknown theme.', id);
        return false;
      }
      current = id;
      root.setAttribute(THEME_ATTRIBUTE, id);
      storage.setItem(THEME_STORAGE_KEY, id);
      return true;
    },
  });
}
