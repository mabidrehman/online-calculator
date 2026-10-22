import { THEMES } from '../features/themes.js';

/**
 * Fills the theme <select> with one option per theme (generated from THEMES
 * so the list is defined in one place) and reports selections.
 *
 * @param {HTMLSelectElement} select
 * @param {{ currentThemeId: string, onSelect: (themeId: string) => void }} options
 */
export function renderThemePicker(select, { currentThemeId, onSelect }) {
  const document = select.ownerDocument;

  const options = THEMES.map(({ id, label }) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    return option;
  });

  select.replaceChildren(...options);
  select.value = currentThemeId;
  select.addEventListener('change', () => onSelect(select.value));
}
