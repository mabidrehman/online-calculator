import { THEMES } from '../features/themes.js';

const RADIO_GROUP_NAME = 'tema';

/**
 * Renders one radio option per theme (generated from THEMES so the list is
 * defined in one place) and reports selections.
 *
 * @param {HTMLElement} container
 * @param {{ currentThemeId: string, onSelect: (themeId: string) => void }} options
 */
export function renderThemePicker(container, { currentThemeId, onSelect }) {
  const document = container.ownerDocument;

  const options = THEMES.map(({ id, label }) => {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = RADIO_GROUP_NAME;
    input.value = id;
    input.className = 'visually-hidden';
    input.checked = id === currentThemeId;

    const swatch = document.createElement('span');
    swatch.className = 'theme-option__swatch';
    swatch.dataset.theme = id;
    swatch.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = label;

    const option = document.createElement('label');
    option.className = 'theme-option';
    option.append(input, swatch, text);
    return option;
  });

  container.replaceChildren(...options);

  container.addEventListener('change', (event) => {
    if (event.target instanceof document.defaultView.HTMLInputElement && event.target.name === RADIO_GROUP_NAME) {
      onSelect(event.target.value);
    }
  });
}
