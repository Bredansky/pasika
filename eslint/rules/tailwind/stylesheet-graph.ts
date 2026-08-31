/**
 * Stylesheet import-graph construction shared by the cross-file rules.
 *
 * `css-entry-point` resolves "is this stylesheet the entry point, a direct
 * child of it, or merely reachable" from the `src/` tree on disk. Building that
 * graph — finding the Tailwind-registering entry points, walking `@import`
 * chains, and separating direct children from transitively-reachable files — is
 * the interesting part of the rule and is kept here so the rule only applies
 * the verdicts.
 */

import path from "node:path";

export interface StylesheetGraph {
  /** Stylesheets that register Tailwind — candidate global entry points. */
  globals: string[];
  /** Normalized paths reachable from an entry point through @import chains. */
  reachable: Set<string>;
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

  // Stylesheets reachable from an entry point through @import chains.
  const reachable = new Set<string>();
  const queue = [...globals];
  for (const global of globals) reachable.add(path.normalize(global));
  while (queue.length > 0) {
    const from = queue.shift();
    if (!from) continue;
    for (const spec of importedSpecifiers(textOf(from))) {
      const target = resolveSpecifier(from, spec, sourceRoot);
      if (!target) continue;
      const normalized = path.normalize(target);
      if (cssSet.has(normalized) && !reachable.has(normalized)) {
        reachable.add(normalized);
        queue.push(normalized);
      }
    }
  }

  // Stylesheets the entry points import directly (no intermediate import).
  // Project CSS is only legitimate in these, so content arrives via the entry.
  const directChildren = new Set<string>();
  for (const global of globals) {
    for (const spec of importedSpecifiers(textOf(global))) {
      const target = resolveSpecifier(global, spec, sourceRoot);
      if (!target) continue;
      const normalized = path.normalize(target);
      if (cssSet.has(normalized)) directChildren.add(normalized);
    }
  }

  return { globals, reachable, directChildren };
}