import path from "node:path";

/**
 * The repository's `src/` root, resolved against ESLint's `cwd` option rather
 * than the process working directory.
 *
 * Rules run composed through a meta-framework (zirka) or as standalone ESLint
 * plugins; the process `cwd` is whatever shell launched the binary, which need
 * not be the linted repository. ESLint carries the linted project's directory
 * in `context.cwd`, so resolving `src/` from there keeps the cross-file rules
 * pointed at the right tree regardless of how pasika is invoked.
 */
export function sourceRootOf(context: { cwd?: string }): string {
  return path.resolve(context.cwd ?? process.cwd(), "src");
}
