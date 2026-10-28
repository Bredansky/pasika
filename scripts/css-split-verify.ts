/**
 * Opt-in Tailwind compiler parity for a virtual CSS split.
 * Fragments live only in an OS temporary directory, never in the target project.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import type { CssSplitPlan } from "../eslint/rules/tailwind/css-split-plan";
import { projectCssSplit } from "../eslint/rules/tailwind/css-split-plan";

interface TailwindCompiler {
  compile: (
    css: string,
    options: {
      base: string;
      from: string;
      onDependency: (dependency: string) => void;
      customCssResolver?: (specifier: string, base: string) => Promise<string | undefined>;
    },
  ) => Promise<{
    build: (candidates: string[]) => string;
    sources: { base: string; pattern: string; negated: boolean }[];
  }>;
}

interface TailwindScanner {
  Scanner: new (options: { sources: { base: string; pattern: string; negated: boolean }[] }) => {
    scan: () => string[];
  };
}

export interface CssSplitVerification {
  matched: boolean;
  candidates: number;
  originalBytes: number;
  projectedBytes: number;
  firstDifference: number | null;
  sourcesMatched: boolean;
}

/**
 * Compare actual Tailwind output with the same discovered candidates.
 * Equality is evidence for THIS compiler stage only: browser rendering,
 * URL rewriting and final application bundling still need verification.
 */
export async function verifyCssSplit(options: {
  root: string;
  sourceRoot: string;
  cssPath: string;
  content: string;
  plan: CssSplitPlan;
}): Promise<CssSplitVerification> {
  const requireFromProject = createRequire(path.join(options.root, "package.json"));
  const compilerPath = requireFromProject.resolve("@tailwindcss/node");
  const scannerPath = requireFromProject.resolve("@tailwindcss/oxide");
  const compiler = z
    .object({ compile: z.custom<TailwindCompiler["compile"]>((value) => typeof value === "function") })
    .parse(await import(pathToFileURL(compilerPath).href));
  const scannerModule = z
    .object({ Scanner: z.custom<TailwindScanner["Scanner"]>((value) => typeof value === "function") })
    .parse(await import(pathToFileURL(scannerPath).href));
  const scanner = new scannerModule.Scanner({
    sources: [{ base: options.sourceRoot, pattern: "**/*.{js,jsx,ts,tsx,mdx}", negated: false }],
  });
  const candidates = [...new Set(scanner.scan())].sort();
  const projection = projectCssSplit(options.content, options.plan);
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "pasika-css-virtual-split-"));
  try {
    const fragmentPaths = new Map<string, string>();
    for (const fragment of projection.fragments) {
      const destination = path.join(tempDir, path.basename(fragment.specifier));
      writeFileSync(destination, fragment.content);
      fragmentPaths.set(fragment.specifier, destination);
    }
    const base = path.dirname(options.cssPath);
    const compileOptions = { base, from: options.cssPath, onDependency: () => undefined };
    const original = await compiler.compile(options.content, compileOptions);
    const projected = await compiler.compile(projection.entry, {
      ...compileOptions,
      customCssResolver: (specifier) => Promise.resolve(fragmentPaths.get(specifier)),
    });
    const originalCss = original.build(candidates);
    const projectedCss = projected.build(candidates);
    let firstDifference: number | null = null;
    if (originalCss !== projectedCss) {
      const limit = Math.min(originalCss.length, projectedCss.length);
      let index = 0;
      while (index < limit && originalCss[index] === projectedCss[index]) index++;
      firstDifference = index;
    }
    const sourcesMatched = JSON.stringify(original.sources) === JSON.stringify(projected.sources);
    return {
      matched: firstDifference === null && sourcesMatched,
      candidates: candidates.length,
      originalBytes: Buffer.byteLength(originalCss),
      projectedBytes: Buffer.byteLength(projectedCss),
      firstDifference,
      sourcesMatched,
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
