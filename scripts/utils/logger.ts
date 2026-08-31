/**
 * Terminal logger for the pasika scripts.
 *
 * The scripts report to a terminal, so they need console output. `no-console`
 * stays enabled everywhere else; this module is the single place that owns the
 * calls, so the rule is scoped to this file alone.
 */
/* eslint-disable no-console -- logger-owns-terminal-output */

/** Prints a line to standard output. */
export function log(...args: unknown[]): void {
  console.log(...args);
}

/** Prints a line to standard error. */
export function logError(...args: unknown[]): void {
  console.error(...args);
}

/* eslint-enable no-console -- logger-owns-terminal-output */
