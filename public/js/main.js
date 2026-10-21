import { initCalculatorApp } from './app.js';
import { logger } from './shared/logger.js';
import { UI_TEXT } from './shared/messages.js';

// Entry point: start the app and show a clear message if anything fails.
try {
  initCalculatorApp({ document, window });
} catch (error) {
  logger.error('Calculator failed to start.', error);
  const status = document.getElementById('app-status');
  if (status) status.textContent = UI_TEXT.appLoadFailed;
}
