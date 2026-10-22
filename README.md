# Calculadora online

A basic Spanish-language online calculator built with plain HTML, CSS and JavaScript (ES modules). It has no build step, no backend and no runtime dependencies.

**Features:** addition, subtraction, multiplication and division, decimals (shown with a decimal comma), negative numbers, parentheses with standard operator precedence, clear, backspace, equals, full keyboard support, a history showing the latest completed calculation (stored in the browser), six calculator colour themes chosen from a dropdown (Claro by default; themes recolour only the calculator), and a responsive homepage with Spanish SEO content and FAQ structured data.

## Setup

Requirements: Node.js 20 or newer (only needed to run the tests), plus any static web server.

```bash
npm install   # installs jsdom, the only dev dependency (used by tests)
npm test      # runs all unit and integration tests
```

### Running locally

The site is the `public/` folder. Because it uses ES modules, it must be served over HTTP. Opening `index.html` directly from disk (`file://`) will not work.

- **Laragon / Apache:** start Laragon and open `http://localhost/Days%20calculator/public/`. For the best setup, point a virtual host's document root at `public/`.
- **Any other static server:** serve `public/`, for example `python -m http.server 8080 --directory public`.

### Deploying

Upload only the contents of `public/`. On Apache, `public/.htaccess` sets the security headers (CSP, `nosniff`, `frame-ancestors`, and others) and cache headers. On other servers (Nginx, Netlify, a CDN), set the same headers in that platform's config.

Before going live, add a `<link rel="canonical">` and `og:url` with your real domain in `public/index.html`, and optionally a `sitemap.xml`. These were left out because the domain isn't known yet.

There are no secrets or environment variables. If you add some later, keep them in `.env`, which is already ignored by git.

## How the code is organised

```
public/                    Web root (the only folder that should be served)
  index.html               Page markup, SEO content, FAQ + JSON-LD, CSP
  css/themes.css           Calculator-scoped tokens for the 6 themes
  css/styles.css           Layout and components (mobile first)
  js/theme-boot.js         Tiny classic script: applies saved theme before first paint
  js/main.js               Entry point: starts the app, shows an error if it fails
  js/app.js                Wires DOM events to the state machine, history and themes
  js/core/                 Pure logic, no DOM
    syntax.js              Canonical expression format and validators
    tokenizer.js           Expression string → tokens
    parser.js              Recursive-descent evaluator (no eval), nesting limit
    calculate.js           tokenize + evaluate + round to 15 significant digits
    calculator-state.js    Keypad input rules (state machine) and live preview
    number-format.js       Rounding and Spanish display formatting (× ÷ − ,)
    errors.js              Error codes + CalculationError
  js/features/             Browser features, each with its dependencies passed in
    history.js             Validated history (keeps only the latest calculation)
    themes.js              Theme list and controller
    keyboard.js            Key → action mapping
  js/ui/                   Rendering only (textContent / DOM APIs, never innerHTML)
  js/shared/               Logger, safe localStorage wrapper, Spanish UI messages
tests/
  unit/                    Engine, state machine, storage, history, themes, keyboard
  integration/             Real index.html in jsdom: user flows, SEO, CSP, a11y
  helpers/                 Shared test utilities (DOM driver, in-memory storage)
```

### Data flow

User input (click or key) → **action** → `applyAction(state, action)` (pure) → new **state** → views re-render. When "=" succeeds, the completed calculation is added to **history** and saved to `localStorage`.

Expressions are stored in a canonical ASCII form (`-1.5*(2+3)`) and only converted to the Spanish display form (`−1,5×(2+3)`) when rendered.

### Adding a theme

1. Add `{ id, label }` to `THEMES` in `public/js/features/themes.js`.
2. Add a matching `[data-calculator-theme="id"] .calculator { … }` block with every token to `public/css/themes.css`.

The tests fail if a theme has no CSS, misses a token or has text below WCAG AA contrast.

## Security notes

- Expressions are evaluated by a hand-written parser. `eval`/`Function` are never used.
- All dynamic text is written with `textContent`. Data loaded from `localStorage` is re-validated, and tampered entries are dropped.
- A strict CSP allows only same-origin scripts and styles, with no inline code.
- The root `.htaccess` denies access to everything outside `public/` (`node_modules`, `tests`, `.git`).
