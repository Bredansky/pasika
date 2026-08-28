import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parseModule, type ParsedModule } from "./parse-module";

const MODULE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const INDEX_BASENAMES = ["index.ts", "index.tsx", "index.mts", "index.cts", "index.js", "index.jsx"];

/**
 * How long a built index is trusted before its inputs are re-checked. A long
 * lived ESLint server keeps this module in memory across edits, so the index has
 * to notice a changed tree without re-reading it on every single file.
 */
const REVALIDATE_AFTER_MS = 2000;

export interface ProjectIndex {
  sourceRoot: string;
  /** Absolute file path to its parsed module. */
  modules: Map<string, ParsedModule>;
  /** Absolute file path to the files that import it. */
  consumers: Map<string, Set<string>>;
  /** `file` and name joined by a NUL, to the files that import that name from it. */
  symbolConsumers: Map<string, Set<string>>;
}

export const symbolKey = (file: string, name: string): string => `${file}\u0000${name}`;

function listSourceFiles(dir: string): string[] {
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
    if (stats.isDirectory()) return listSourceFiles(entryPath);
    return MODULE_EXTENSIONS.includes(path.extname(entry)) ? [entryPath] : [];
  });
}

/** Cheap fingerprint of the tree, so an unchanged tree is never re-parsed. */
function fingerprint(files: string[]): string {
  let total = 0;
  for (const file of files) {
    try {
      total += statSync(file).mtimeMs;
    } catch {
      /* A file removed between listing and stat just drops out of the fingerprint. */
    }
  }
  return `${String(files.length)}:${String(total)}`;
}

/** Resolves an import specifier to a file inside the source tree, if it points at one. */
export function resolveSpecifier(fromFile: string, specifier: string, sourceRoot: string): string | undefined {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = path.resolve(sourceRoot, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return undefined;
  }

  const candidates = [
    base,
    ...MODULE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...INDEX_BASENAMES.map((name) => path.join(base, name)),
  ];

  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      /* Try the next candidate. */
    }
  }
  return undefined;
}

function build(sourceRoot: string, files: string[]): ProjectIndex {
  const modules = new Map<string, ParsedModule>();
  const consumers = new Map<string, Set<string>>();
  const symbolConsumers = new Map<string, Set<string>>();

  for (const file of files) {
    try {
      modules.set(file, parseModule(file));
    } catch {
      /* A file that cannot be read or parsed contributes nothing to the graph. */
    }
  }

  for (const [file, module] of modules) {
    for (const moduleImport of module.imports) {
      const target = resolveSpecifier(file, moduleImport.specifier, sourceRoot);
      if (!target || !modules.has(target)) continue;

      const fileConsumers = consumers.get(target) ?? new Set<string>();
      fileConsumers.add(file);
      consumers.set(target, fileConsumers);

      for (const name of moduleImport.names) {
        const key = symbolKey(target, name);
        const nameConsumers = symbolConsumers.get(key) ?? new Set<string>();
        nameConsumers.add(file);
        symbolConsumers.set(key, nameConsumers);
      }
    }
  }

  return { sourceRoot, modules, consumers, symbolConsumers };
}

let cache: { index: ProjectIndex; checkedAt: number; fingerprint: string } | undefined;

/**
 * The project index for a source tree, rebuilt only when the tree changed.
 * Returns undefined when the tree does not exist, which is how a repository
 * without a `src/` folder opts out of every cross-file rule.
 */
export function getProjectIndex(sourceRoot: string): ProjectIndex | undefined {
  const now = Date.now();
  if (cache?.index.sourceRoot === sourceRoot && now - cache.checkedAt < REVALIDATE_AFTER_MS) {
    return cache.index;
  }

  try {
    if (!statSync(sourceRoot).isDirectory()) return undefined;
  } catch {
    return undefined;
  }

  const files = listSourceFiles(sourceRoot).sort((left, right) => left.localeCompare(right));
  const currentFingerprint = fingerprint(files);

  if (cache?.index.sourceRoot === sourceRoot && cache.fingerprint === currentFingerprint) {
    cache.checkedAt = now;
    return cache.index;
  }

  const index = build(sourceRoot, files);
  cache = { index, checkedAt: now, fingerprint: currentFingerprint };
  return index;
}

/** Drops the memoized index. Used by tests that write a fresh tree per case. */
export function clearProjectIndex(): void {
  cache = undefined;
}
