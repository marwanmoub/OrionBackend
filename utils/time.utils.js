/**
 * utils/time.utils.js
 * Tiny date-math helpers.
 */

/** Return a new Date that is `minutes` before `date`. */
export function subtractMinutes(date, minutes) {
  return new Date(date.getTime() - minutes * 60_000);
}

/** Return a new Date that is `minutes` after `date`. */
export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}
