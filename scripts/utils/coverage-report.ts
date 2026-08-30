import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { allPasikaRuleIds } from "../../eslint/index";
import { normalizeRequirement } from "./normalize";
import { parseDocs, type ParsedRequirement } from "./parse-docs";
import type { Registry, Requirement } from "../types";

export interface CoverageIssue {
  kind: "new" | "changed" | "removed" | "unknown-ref" | "missing-test" | "unassigned-rule";
  doc: string;
  line?: number;
  text: string;
  /** Hash of the requirement as it reads now, so a new entry can be recorded without recomputing it. */
  hash?: string;
  detail?: string;
}

export interface CoverageReport {
  /** Requirements with a ref: a rule or check governs them. */
  governed: number;
  /** Requirements without a ref: a reviewer or agent applies them. */
  judgment: number;
  total: number;
  issues: CoverageIssue[];
  /** Registry updated for `--accept`: reworded requirements rehashed, removed ones dropped. */
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

/** Titles passed to `describe` or `test` in the rule test files, recursing into subfolders. */
function collectTestTitles(rulesDir: string): Set<string> {
  const titles = new Set<string>();
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const entryPath = path.join(dir, entry);
      if (statSync(entryPath).isDirectory()) {
        visit(entryPath);
        continue;
      }
      if (!entry.endsWith(".test.ts")) continue;
      const body = readFileSync(entryPath, "utf8");
      const titlePattern = /\b(?:describe|test|it)\(\s*(?:"(?<double>(?:[^"\\]|\\.)*)"|'(?<single>(?:[^'\\]|\\.)*)')/g;
      for (const match of body.matchAll(titlePattern)) {
        const title = match.groups?.double ?? match.groups?.single ?? "";
        titles.add(title.replaceAll("`", "").replaceAll('\\"', '"').replaceAll("\\'", "'"));
      }
    }
  };
  visit(rulesDir);
  return titles;
}

/** A requirement several checks cover lists them comma-separated. */
function refParts(ref: string | undefined): string[] {
  return (ref ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Whether any ref names a rule whose requirement must have a titled test. */
function hasEslintRef(requirement: Requirement): boolean {
  return refParts(requirement.ref).some((part) => allPasikaRuleIds.includes(part));
}

/** A ref names a known ESLint rule id. */
function isRefKnown(requirement: Requirement): boolean {
  const parts = refParts(requirement.ref);
  if (parts.length === 0) return true;
  return parts.every((part) => allPasikaRuleIds.includes(part));
}

export function buildCoverageReport(options: {
  docsRoot: string;
  registry: Registry;
  rulesDir: string;
}): CoverageReport {
  const { docsRoot, registry, rulesDir } = options;
  const docs = parseDocs(docsRoot);
  const testTitles = collectTestTitles(rulesDir);

  const byHash = new Map(registry.requirements.map((requirement) => [requirement.hash, requirement]));
  const matched = new Set<string>();
  const issues: CoverageIssue[] = [];
  let governed = 0;
  let judgment = 0;

  const nextRequirements: Requirement[] = [];

  const parsed: { doc: string; requirement: ParsedRequirement }[] = docs.flatMap((doc) =>
    doc.requirements.map((requirement) => ({ doc: doc.doc, requirement })),
  );

  for (const { doc, requirement } of parsed) {
    const recorded = byHash.get(requirement.hash);
    if (recorded) {
      matched.add(requirement.hash);
      if (recorded.ref) governed += 1;
      else judgment += 1;
      nextRequirements.push({ ...recorded, doc, text: requirement.raw });

      if (!isRefKnown(recorded)) {
        issues.push({
          kind: "unknown-ref",
          doc,
          line: requirement.line,
          text: requirement.raw,
          detail: `ref "${recorded.ref ?? "(none)"}" does not exist`,
        });
      }
      if (hasEslintRef(recorded) && !testTitles.has(requirement.text)) {
        issues.push({
          kind: "missing-test",
          doc,
          line: requirement.line,
          text: requirement.raw,
          detail: `no rule test is titled with this requirement`,
        });
      }
      continue;
    }

    // Not recorded under this hash: either a reworded requirement or a new one.
    const candidate = registry.requirements
      .filter((entry) => entry.doc === doc && !matched.has(entry.hash))
      .map((entry) => ({ entry, score: similarity(normalizeRequirement(entry.text), requirement.text) }))
      .sort((left, right) => right.score - left.score)
      .find(({ score }) => score >= 0.5);

    if (candidate) {
      matched.add(candidate.entry.hash);
      if (candidate.entry.ref) governed += 1;
      else judgment += 1;
      nextRequirements.push({ ...candidate.entry, doc, text: requirement.raw, hash: requirement.hash });
      issues.push({
        kind: "changed",
        doc,
        line: requirement.line,
        text: requirement.raw,
        hash: requirement.hash,
        detail: `was "${candidate.entry.text}" — re-verify ${candidate.entry.ref ? ` ${candidate.entry.ref}` : "(no check)"}`,
      });
    } else {
      issues.push({ kind: "new", doc, line: requirement.line, text: requirement.raw, hash: requirement.hash });
    }
  }

  for (const entry of registry.requirements) {
    if (matched.has(entry.hash)) continue;
    issues.push({
      kind: "removed",
      doc: entry.doc,
      text: entry.text,
      detail: `recorded with ${entry.ref ? `ref ${entry.ref}` : "no check"} but the bullet is gone`,
    });
  }

  // Reverse direction: every exported rule must be assigned to a requirement.
  // A rule with no requirement behind it is dead/undocumented surface.
  const assignedRefs = new Set<string>();
  for (const entry of registry.requirements) {
    for (const part of refParts(entry.ref)) assignedRefs.add(part);
  }
  for (const ruleId of allPasikaRuleIds) {
    if (assignedRefs.has(ruleId)) continue;
    issues.push({
      kind: "unassigned-rule",
      doc: "*",
      text: ruleId,
      detail: "exported rule is not assigned to any documented requirement",
    });
  }

  return {
    governed,
    judgment,
    total: parsed.length,
    issues,
    nextRegistry: { requirements: nextRequirements },
  };
}
