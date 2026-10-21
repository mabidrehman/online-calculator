/**
 * Conversions between numbers, canonical expression strings and the Spanish
 * display format.
 */

/**
 * Results are rounded to this many significant digits. 15 is the most a
 * double always represents faithfully, so this hides binary floating-point
 * noise (0.1 + 0.2 → 0.3) without altering exactly representable numbers.
 */
export const SIGNIFICANT_DIGITS = 15;

const DISPLAY_CHARACTERS = Object.freeze({
  '*': '×',
  '/': '÷',
  '-': '−',
  '.': ',',
});

/** Rounds to SIGNIFICANT_DIGITS and normalises -0 to 0. */
export function roundToSignificantDigits(value) {
  const rounded = Number(value.toPrecision(SIGNIFICANT_DIGITS));
  return rounded === 0 ? 0 : rounded;
}

/** Number → canonical string that can be fed back into an expression. */
export function toCanonicalNumber(value) {
  return String(value);
}

/** Canonical expression → Spanish display text ("-1.5*2" → "−1,5×2"). */
export function formatForDisplay(expression) {
  let formatted = '';
  for (const character of expression) {
    formatted += DISPLAY_CHARACTERS[character] ?? character;
  }
  return formatted;
}
