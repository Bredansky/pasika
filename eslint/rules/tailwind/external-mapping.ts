/** External providers own referenced CSS variables, not other project tokens. */
export function externalMapping(value: string, token: string, authoredVariables: ReadonlySet<string>): boolean {
  const match = /^var\s*\(\s*(?<source>--[a-z][\w-]*)\s*,\s*(?<fallback>[\s\S]+)\)$/u.exec(value.trim());
  const source = match?.groups?.source;
  const fallback = match?.groups?.fallback?.trim();
  return Boolean(
    source && source !== token && !authoredVariables.has(source) && fallback && !/\bvar\s*\(/u.test(fallback),
  );
}
