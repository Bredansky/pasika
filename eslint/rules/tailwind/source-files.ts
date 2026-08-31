/**
 * Filesystem helpers shared by the cross-file Tailwind rules.
 *
 * Both `css-entry-point` and `unused-utility` read the `src/` tree from
 * disk — a single stylesheet cannot see what other files import it or use a
 * utility. These helpers keep the recursive walk and the one-kept-read-once
 * text cache in one place so the rules only describe what to scan and what to
 * do with the graph.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/** Stylesheets. */
export const CSS_EXTENSIONS = [".css"];

/** Application modules that can import a stylesheet or use a utility. */
export const MODULE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

/** Every file that could reference a utility class: source modules and stylesheets. */
export const SOURCE_EXTENSIONS = [...MODULE_EXTENSIONS, ...CSS_EXTENSIONS];

/** Every file under `dir` with one of the given extensions, recursively. */
export function findFiles(dir: string, extensions: string[]): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    if (entry.startsWith(".") || entry === "node_modules") return [];
    const entryPath = path.join(dir, entry);
    let stats;
    try {
      stats = statSync(entryPath);
    } catch {
      return [];
    }
    if (stats.isDirectory()) return findFiles(entryPath, extensions);
    return extensions.includes(path.extname(entry)) ? [entryPath] : [];
  });
}

/**
 * A text reader that reads each file at most once per rule instance. Rules call
 * it for lambdas that scan whole trees, so a shared cache stops the same file
 * being re-read for every stylesheet that references it.
 */
export function cachedTextReader(): (file: string) => string {
  const texts = new Map<string, string>();
  return (file: string): string => {
    let text = texts.get(file);
    if (text === undefined) {
      try {
        text = readFileSync(file, "utf8");
      } catch {
        text = "";
      }
      texts.set(file, text);
    }
    return text;
  };
}
/** Escape a string for use inside a RegExp. */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
