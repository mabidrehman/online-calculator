// Classic (non-module) script loaded in <head> so a saved calculator theme is
// applied before first paint, avoiding a flash of the wrong colours. The key
// and attribute must match THEME_STORAGE_KEY and THEME_ATTRIBUTE in
// features/themes.js (enforced by tests). First-time visitors get the default
// (Claro) from the CSS; unknown values are corrected by the theme controller.
(function applySavedTheme() {
  try {
    var saved = window.localStorage.getItem('calculadora.tema');
    if (saved) {
      document.documentElement.setAttribute('data-calculator-theme', saved);
    }
  } catch (error) {
    // Storage blocked (e.g. private mode): keep the default theme.
  }
})();
