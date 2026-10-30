/**
 * Stylesheet import-graph construction shared by the cross-file rules.
 *
 * `css-entry-point` finds Tailwind-registering entry points and the
 * stylesheets they import directly from the `src/` tree on disk.
 */

import path from "node:path";

export interface StylesheetGraph {
  /** Stylesheets that register Tailwind — candidate global entry points. */
  globals: string[];
  /** Normalized paths an entry point imports *directly* (no midpoint). */
  directChildren: Set<string>;
}

/** Whether a stylesheet registers Tailwind — the marker of the global entry point. */
export function registersTailwind(text: string): boolean {
  return /@import\s+(?:url\(\s*)?["']tailwindcss["']\s*\)?/i.test(text);
}

/** The specifiers of a stylesheet's `@import` statements. */
export function importedSpecifiers(text: string): string[] {
  return [...text.matchAll(/@import\s+(?:url\(\s*)?["'](?<spec>[^"']+)["']/gi)].map(
    (match) => match.groups?.spec ?? "",
  );
}

/** Whether a module imports the given stylesheet by name. */
export function moduleImports(text: string, fileName: string): boolean {
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:import|require)\\s*\\(?\\s*["'][^"']*${escaped}["']`, "i").test(text);
}

/** Resolve a `@import`/JS import specifier to an absolute path, or `undefined` when it is a package. */
export function resolveSpecifier(fromFile: string, spec: string, sourceRoot: string): string | undefined {
  if (spec.startsWith("/")) return path.resolve(spec);
  if (spec.startsWith("./") || spec.startsWith("../")) return path.resolve(path.dirname(fromFile), spec);
  if (spec.startsWith("@/")) return path.resolve(sourceRoot, spec.slice(2));
  return undefined;
}

/** Build the import graph for all stylesheets under `sourceRoot`. */
export function buildStylesheetGraph(options: {
  cssFiles: string[];
  sourceRoot: string;
  textOf: (file: string) => string;
}): StylesheetGraph {
  const { cssFiles, sourceRoot, textOf } = options;
  const cssSet = new Set(cssFiles.map((file) => path.normalize(file)));

  // The global entry points: every stylesheet that registers Tailwind.
  const globals = cssFiles.filter((file) => registersTailwind(textOf(file)));

  // Stylesheets the entry points import directly (no intermediate import).
  // Every project stylesheet must be one of these direct children.
  const directChildren = new Set<string>();
  for (const global of globals) {
    for (const spec of importedSpecifiers(textOf(global))) {
      const target = resolveSpecifier(global, spec, sourceRoot);
      if (!target) continue;
      const normalized = path.normalize(target);
      if (cssSet.has(normalized)) directChildren.add(normalized);
    }
  }

  return { globals, directChildren };
}
