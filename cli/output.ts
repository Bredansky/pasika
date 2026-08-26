/* eslint-disable no-console -- cli-reports-to-terminal: stdout is the CLI's output channel */

export function log(message: string): void {
  console.log(message);
}

export function error(message: string): void {
  console.error(message);
}

export function json(data: unknown): void {
  console.log(JSON.stringify(data, undefined, 2));
}

/* eslint-enable no-console -- re-enable after CLI output block */
