/**
 * Constantes de la aplicación
 * Centraliza valores que se usan en múltiples lugares
 */

export const DEFAULT_USD_TO_ARS_RATE = 1000;

export const MESSAGE_HISTORY_LIMIT = 20;

export const SESSION_CLEANUP_DAYS = 30;

export const BUSINESS_HOURS = {
  START: 10,
  END: 17,
  SLOTS: ['10:00', '11:00', '16:00', '17:00'],
} as const;

export const BUSINESS_DAYS_COUNT = 3;

