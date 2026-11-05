/**
 * Ask the installed Tailwind v4 design system which utilities each @theme token
 * generates. Token-specific markers avoid a hand-maintained namespace -> class
 * prefix table (which previously missed --shadow-* and --drop-shadow-*).
 *
 * ESLint rule visitors are synchronous, but Tailwind's design-system loader is
 * async. Resolve tokens in one bounded subprocess per uncached batch.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const WORKER = String.raw`
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const { names, projectRoot, moduleUrl } = JSON.parse(readFileSync(0, "utf8"));
let resolved;
try {
  resolved = createRequire(path.join(projectRoot, "package.json")).resolve("@tailwindcss/node");
} catch {
  resolved = createRequire(moduleUrl).resolve("@tailwindcss/node");
}
const { __unstable__loadDesignSystem } = await import(pathToFileURL(resolved).href);
if (typeof __unstable__loadDesignSystem !== "function") {
  throw new Error("@tailwindcss/node design-system API is unavailable");
}
const css = "@theme inline {\n" + names.map((name, index) =>
  name + "-pasika-owner-" + index + ": 1px;"
).join("\n") + "\n}";
const designSystem = await __unstable__loadDesignSystem(css);
const available = designSystem.getClassList().map(([name]) => name);
const result = names.map((_, index) => {
  const marker = "-pasika-owner-" + index;
  return available.filter((name) => name.endsWith(marker)).map((name) => name.slice(0, -marker.length));
});
process.stdout.write(JSON.stringify(result));
`;

const cache = new Map<string, string[]>();
const TOKEN = /^--[a-z][a-z0-9-]*$/u;

function isStringGroups(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.every((group: unknown) => Array.isArray(group) && group.every((item) => typeof item === "string"))
  );
}

export function themeClassesForTokens(names: readonly string[], sourceRoot: string): Map<string, string[]> {
  const projectRoot = path.dirname(sourceRoot);
  const unique = [...new Set(names)].filter((name) => TOKEN.test(name) && name !== "--spacing");
  const missing = unique.filter((name) => !cache.has(`${projectRoot}\u0000${name}`));
  if (missing.length > 0) {
    const child = spawnSync(process.execPath, ["--input-type=module", "--eval", WORKER], {
      cwd: existsSync(projectRoot) ? projectRoot : process.cwd(),
      input: JSON.stringify({ names: missing, projectRoot, moduleUrl: import.meta.url }),
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    });
    if (child.error || child.status !== 0) {
      const detail = child.error?.message ?? (child.stderr.trim() || "Tailwind could not resolve theme utilities");
      throw new Error(`Cannot resolve Tailwind theme classes: ${detail}`);
    }
    const result: unknown = JSON.parse(child.stdout);
    if (!isStringGroups(result) || result.length !== missing.length) {
      throw new Error("Unexpected Tailwind theme class resolver output");
    }
    for (const [index, name] of missing.entries()) {
      const classes = result[index];
      if (!classes) throw new Error("Missing Tailwind theme class result");
      cache.set(`${projectRoot}\u0000${name}`, classes);
    }
  }
  return new Map(unique.map((name) => [name, cache.get(`${projectRoot}\u0000${name}`) ?? []]));
}

export function themeClasses(name: string): string[] {
  return themeClassesForTokens([name], path.resolve("src")).get(name) ?? [];
}
