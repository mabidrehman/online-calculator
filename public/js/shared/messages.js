import { MAX_EXPRESSION_LENGTH } from '../core/calculator-state.js';
import { ErrorCode } from '../core/errors.js';

/** User-facing Spanish text. Keep all UI copy produced by JavaScript here. */

const ERROR_MESSAGES = Object.freeze({
  [ErrorCode.DIVISION_BY_ZERO]: 'No se puede dividir entre cero.',
  [ErrorCode.INCOMPLETE_EXPRESSION]: 'La operación está incompleta.',
  [ErrorCode.INVALID_EXPRESSION]: 'La operación no es válida.',
  [ErrorCode.MISMATCHED_PARENTHESES]: 'Revisa los paréntesis de la operación.',
  [ErrorCode.RESULT_OUT_OF_RANGE]: 'El resultado es demasiado grande para mostrarlo.',
  [ErrorCode.EXPRESSION_TOO_COMPLEX]: 'La operación tiene demasiados niveles de paréntesis.',
  [ErrorCode.EXPRESSION_TOO_LONG]: `La operación no puede superar los ${MAX_EXPRESSION_LENGTH} caracteres.`,
});

export const UI_TEXT = Object.freeze({
  historyEntryLabel: (expression, result) => `Usar resultado ${result} de ${expression}`,
  appLoadFailed: 'La calculadora no se pudo cargar. Recarga la página para intentarlo de nuevo.',
});

export function getErrorMessage(code) {
  return Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code] : 'Se produjo un error inesperado.';
}
