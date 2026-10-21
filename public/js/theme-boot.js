// Classic (non-module) script loaded in <head> so the saved theme is applied
// before first paint, avoiding a flash of the wrong colours. The storage key
// must match THEME_STORAGE_KEY in features/themes.js (enforced by tests);
// unknown values are corrected by the theme controller once the app loads.
(function applyInitialTheme() {
  var root = document.documentElement;
  try {
    var saved = window.localStorage.getItem('calculadora.tema');
    if (saved) {
      root.setAttribute('data-theme', saved);
      return;
    }
  } catch (error) {
    // Storage blocked (e.g. private mode): fall back to the system preference.
  }
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', prefersDark ? 'oscuro' : 'claro');
})();
