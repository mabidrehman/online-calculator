/**
 * Developer-facing logging with a consistent prefix so messages from this
 * app are easy to filter in the browser console.
 */
const PREFIX = '[calculadora]';

export const logger = Object.freeze({
  warn: (message, ...details) => console.warn(PREFIX, message, ...details),
  error: (message, ...details) => console.error(PREFIX, message, ...details),
});
