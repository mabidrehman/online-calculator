import { logger } from '../shared/logger.js';

/**
 * Must match the key read by js/theme-boot.js, which applies the saved theme
 * before first paint (a test enforces this).
 */
export const THEME_STORAGE_KEY = 'calculadora.tema';

/** Each id has a matching [data-theme="id"] block in css/themes.css. */
export const THEMES = Object.freeze([
  { id: 'claro', label: 'Claro' },
  { id: 'oscuro', label: 'Oscuro' },
  { id: 'oceano', label: 'Océano' },
  { id: 'bosque', label: 'Bosque' },
  { id: 'atardecer', label: 'Atardecer' },
  { id: 'lavanda', label: 'Lavanda' },
  { id: 'retro', label: 'Retro' },
  { id: 'alto-contraste', label: 'Alto contraste' },
]);

export const DEFAULT_THEME_ID = 'claro';

export function isThemeId(id) {
  return THEMES.some((theme) => theme.id === id);
}

/**
 * Applies and persists the theme via the data-theme attribute on `root`.
 * The initial theme is whatever theme-boot.js already applied, if valid.
 *
 * @param {{ root: HTMLElement, storage: ReturnType<import('../shared/storage.js').createSafeStorage> }} deps
 */
export function createThemeController({ root, storage }) {
  let current = isThemeId(root.dataset.theme) ? root.dataset.theme : DEFAULT_THEME_ID;
  root.dataset.theme = current;

  return Object.freeze({
    getCurrent: () => current,

    /** @returns {boolean} Whether the theme was applied. */
    setTheme(id) {
      if (!isThemeId(id)) {
        logger.warn('Ignoring unknown theme.', id);
        return false;
      }
      current = id;
      root.dataset.theme = id;
      storage.setItem(THEME_STORAGE_KEY, id);
      return true;
    },
  });
}
