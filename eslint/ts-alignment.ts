/**
 * TypeScript alignment diagnostic.
 *
 * The `nextjsApp` preset ships its own `@typescript-eslint/parser` (a runtime
 * dependency), which runs on the TypeScript version pasika bundles. The
 * type-aware rules a consumer enables through zirka run on whatever TypeScript
 * the consumer's `node_modules` hoists. When those two TypeScript copies have
 * different *majors*, the type objects the parser builds carry one `TypeFlags`
 * enum (e.g. TS 6's `Union = 2^27`) while the rules read them with another
 * (TS 5's `Union = 2^20`), and every type-aware rule crashes deep inside
 * ts-api-utils with confusing errors like `undefined is not iterable`.
 *
 * This module detects that split at config-load time and fails with an
 * actionable message urging the consumer to align its TypeScript with the
 * compiler pasika bundles — the fix, not a workaround. Within one major, the
 * enum layout is stable, so only a major mismatch is diagnosed.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const ownRequire = createRequire(import.meta.url);

/** The TypeScript majors pasika bundles and the consumer resolves, or null when undeterminable. */
export interface TypescriptAlignment {
  /** pasika's own `typescript` dependency (its bundled parser compiler). */
  bundled: string | null;
  /** The consumer's hoisted `typescript` (what the type-aware rules read flags with). */
  resolved: string | null;
}

const majorOf = (version: string): number => Number(version.split(".")[0]);

function versionOf(packagePath: string): string | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(packagePath, "utf8"));
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed)) return null;
    return typeof parsed.version === "string" ? parsed.version : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the two TypeScript copies from inside the consumer process.
 * `bundled` anchors on pasika's own module (its nested copy when the consumer
 * pins an incompatible major, the hoisted copy when aligned); `resolved`
 * anchors on the consumer's project root, i.e. where eslint was invoked.
 */
export function resolveTypescriptAlignment(): TypescriptAlignment {
  let bundled: string | null = null;
  try {
    bundled = versionOf(ownRequire.resolve("typescript/package.json"));
  } catch {
    bundled = null;
  }

  let resolved: string | null = null;
  try {
    const consumerRequire = createRequire(join(process.cwd(), "package.json"));
    resolved = versionOf(consumerRequire.resolve("typescript/package.json"));
  } catch {
    resolved = null;
  }

  return { bundled, resolved };
}

/**
 * The error to raise for a bundled/resolved pair, or null when the pair is
 * consistent (same major) or undeterminable. Pure — unit-testable without
 * touching the filesystem.
 */
export function alignmentError(bundled: string | null, resolved: string | null): Error | null {
  if (bundled === null || resolved === null) return null;
  const bundledMajor = majorOf(bundled);
  const resolvedMajor = majorOf(resolved);
  if (bundledMajor === resolvedMajor) return null;

  const direction =
    resolvedMajor < bundledMajor
      ? `Upgrade your typescript to ^${String(bundledMajor)} (pinned exact) so a single hoisted copy serves the whole pipeline.`
      : `Your repository is ahead of the compiler pasika ships. Pin typescript to ^${String(bundledMajor)} for now and upgrade pasika when it bundles the newer major.`;

  return new Error(
    `[pasika] TypeScript major mismatch: the pasika nextjsApp preset parses src/** with its bundled ` +
      `@typescript-eslint/parser, which runs on typescript ${bundled}; your repository resolves typescript ` +
      `${resolved} for the type-aware rules. Two TypeScript majors mean the types the parser builds use a ` +
      `different TypeFlags layout than the rules expect, so every type-aware rule crashes (e.g. "undefined is ` +
      `not iterable" in ts-api-utils). Align them on ${String(bundledMajor)}, then lint will run again. ${direction}`,
  );
}

/**
 * Run the diagnostic: resolve both copies and throw `alignmentError` when they
 * disagree. Called lazily the first time the `nextjsApp` preset is consumed, so
 * `typescriptApp`-only repositories are never blocked.
 */
export function assertTypescriptAlignment(): void {
  const { bundled, resolved } = resolveTypescriptAlignment();
  const error = alignmentError(bundled, resolved);
  if (error) throw error;
}