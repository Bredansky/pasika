import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { pasikaRuleIds } from "../eslint/pasika/index.js";
import { DOCS_CHECKS } from "./docs-check.js";
import { parseDocs, type ParsedRequirement } from "./parse-docs.js";
import { MECHANICAL_KINDS, registrySchema, type EnforcementKind, type Registry, type Requirement } from "./types.js";

export interface CoverageIssue {
  kind: "new" | "changed" | "removed" | "retired-reappeared" | "unknown-ref" | "missing-test";
  doc: string;
  line?: number;
  text: string;
  /** Hash of the requirement as it reads now, so a new entry can be recorded without recomputing it. */
  hash?: string;
  detail?: string;
}

export interface CoverageReport {
  counts: Record<EnforcementKind, number>;
  total: number;
  mechanical: number;
  issues: CoverageIssue[];
  /** Registry updated for `--accept`: rehashed changed requirements, retired removed ones. */
  nextRegistry: Registry;
}

/** Ratio of shared words, used only to guess which stored requirement a reworded bullet came from. */
function similarity(left: string, right: string): number {
  const leftWords = new Set(left.toLowerCase().split(/\W+/).filter(Boolean));
  const rightWords = new Set(right.toLowerCase().split(/\W+/).filter(Boolean));
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  const union = new Set([...leftWords, ...rightWords]).size;
  return union === 0 ? 0 : shared / union;
}

/** Titles passed to `describe` or `test` in the rule test files. */
function collectTestTitles(rulesDir: string): Set<string> {
  const titles = new Set<string>();
  for (const entry of readdirSync(rulesDir)) {
    if (!entry.endsWith(".test.ts")) continue;
    const body = readFileSync(path.join(rulesDir, entry), "utf8");
    for (const match of body.matchAll(/\b(?:describe|test|it)\(\s*"(?<title>(?:[^"\\]|\\.)*)"/g)) {
      titles.add((match.groups?.title ?? "").replaceAll('\\"', '"'));
    }
  }
  return titles;
}

/** A requirement several checks cover lists them comma-separated. */
function refParts(ref: string | undefined): string[] {
  return (ref ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isRefKnown(requirement: Requirement, docsChecks: Set<string>): boolean {
  const parts = refParts(requirement.ref);
  if (requirement.kind === "eslint") return parts.length > 0 && parts.every((part) => pasikaRuleIds.includes(part));
  if (requirement.kind === "docs-check") return parts.length > 0 && parts.every((part) => docsChecks.has(part));
  // Doctor checks do not exist yet, so a `doctor` entry is a forward reference.
  return true;
}

export function buildCoverageReport(options: {
  docsRoot: string;
  registry: Registry;
  rulesDir: string;
}): CoverageReport {
  const { docsRoot, registry, rulesDir } = options;
  const docs = parseDocs(docsRoot);
  const docsChecks = new Set<string>(DOCS_CHECKS);
  const testTitles = collectTestTitles(rulesDir);

  const byHash = new Map(registry.requirements.map((requirement) => [requirement.hash, requirement]));
  const retired = new Set(registry.retired);
  const matched = new Set<string>();
  const issues: CoverageIssue[] = [];
  const counts: Record<EnforcementKind, number> = {
    eslint: 0,
    doctor: 0,
    "docs-check": 0,
    judgment: 0,
    permission: 0,
    planned: 0,
  };

  const nextRequirements: Requirement[] = [];
  const newlyRetired: string[] = [];

  const parsed: { doc: string; requirement: ParsedRequirement }[] = docs.flatMap((doc) =>
    doc.requirements.map((requirement) => ({ doc: doc.doc, requirement })),
  );

  for (const { doc, requirement } of parsed) {
    if (retired.has(requirement.hash)) {
      issues.push({
        kind: "retired-reappeared",
        doc,
        line: requirement.line,
        text: requirement.text,
        detail: `hash ${requirement.hash} was retired`,
      });
    }

    const recorded = byHash.get(requirement.hash);
    if (recorded) {
      matched.add(requirement.hash);
      counts[recorded.kind] += 1;
      nextRequirements.push({ ...recorded, doc });

      if (!isRefKnown(recorded, docsChecks)) {
        issues.push({
          kind: "unknown-ref",
          doc,
          line: requirement.line,
          text: requirement.text,
          detail: `${recorded.kind} ref "${recorded.ref ?? "(none)"}" does not exist`,
        });
      }
      if (recorded.kind === "eslint" && !testTitles.has(requirement.text)) {
        issues.push({
          kind: "missing-test",
          doc,
          line: requirement.line,
          text: requirement.text,
          detail: `no rule test is titled with this requirement`,
        });
      }
      continue;
    }

    // Not recorded under this hash: either a reworded requirement or a new one.
    const candidate = registry.requirements
      .filter((entry) => entry.doc === doc && !matched.has(entry.hash))
      .map((entry) => ({ entry, score: similarity(entry.text, requirement.text) }))
      .sort((left, right) => right.score - left.score)
      .find(({ score }) => score >= 0.5);

    if (candidate) {
      matched.add(candidate.entry.hash);
      counts[candidate.entry.kind] += 1;
      nextRequirements.push({ ...candidate.entry, doc, text: requirement.text, hash: requirement.hash });
      issues.push({
        kind: "changed",
        doc,
        line: requirement.line,
        text: requirement.text,
        hash: requirement.hash,
        detail: `was "${candidate.entry.text}" — re-verify ${candidate.entry.kind}${
          candidate.entry.ref ? ` ${candidate.entry.ref}` : ""
        }`,
      });
    } else {
      issues.push({ kind: "new", doc, line: requirement.line, text: requirement.text, hash: requirement.hash });
    }
  }

  for (const entry of registry.requirements) {
    if (matched.has(entry.hash)) continue;
    issues.push({
      kind: "removed",
      doc: entry.doc,
      text: entry.text,
      detail: `recorded as ${entry.kind}${entry.ref ? ` ${entry.ref}` : ""} but the bullet is gone`,
    });
    newlyRetired.push(entry.hash);
  }

  const total = parsed.length;
  let mechanical = 0;
  for (const kind of MECHANICAL_KINDS) mechanical += counts[kind];

  return {
    counts,
    total,
    mechanical,
    issues,
    nextRegistry: {
      requirements: nextRequirements,
      retired: [...new Set([...registry.retired, ...newlyRetired])].sort((a, b) => a.localeCompare(b)),
    },
  };
}

export function readRegistry(registryPath: string): Registry {
  const parsed: unknown = JSON.parse(readFileSync(registryPath, "utf8"));
  const result = registrySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${registryPath} is not a valid enforcement registry:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function writeRegistry(registryPath: string, registry: Registry): void {
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
}
