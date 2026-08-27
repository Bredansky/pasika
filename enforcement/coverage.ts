import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { allPasikaRuleIds } from "../eslint/pasika/index.js";
import { normalizeRequirement } from "./normalize.js";
import { parseDocs, type ParsedRequirement } from "./parse-docs.js";
import { MECHANICAL_KINDS, registrySchema, type EnforcementKind, type Registry, type Requirement } from "./types.js";

export interface CoverageIssue {
  kind: "new" | "changed" | "removed" | "unknown-ref" | "missing-test";
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
        titles.add(title.replaceAll('\\\\"', '"').replaceAll("\\\\'", "'"));
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

function isRefKnown(requirement: Requirement): boolean {
  const parts = refParts(requirement.ref);
  if (requirement.kind === "eslint") return parts.length > 0 && parts.every((part) => allPasikaRuleIds.includes(part));
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
  const testTitles = collectTestTitles(rulesDir);

  const byHash = new Map(registry.requirements.map((requirement) => [requirement.hash, requirement]));
  const matched = new Set<string>();
  const issues: CoverageIssue[] = [];
  const counts: Record<EnforcementKind, number> = {
    eslint: 0,
    doctor: 0,
    planned: 0,
    judgment: 0,
    permission: 0,
  };

  const nextRequirements: Requirement[] = [];

  const parsed: { doc: string; requirement: ParsedRequirement }[] = docs.flatMap((doc) =>
    doc.requirements.map((requirement) => ({ doc: doc.doc, requirement })),
  );

  for (const { doc, requirement } of parsed) {
    const recorded = byHash.get(requirement.hash);
    if (recorded) {
      matched.add(requirement.hash);
      counts[recorded.kind] += 1;
      nextRequirements.push({ ...recorded, doc, text: requirement.raw });

      if (!isRefKnown(recorded)) {
        issues.push({
          kind: "unknown-ref",
          doc,
          line: requirement.line,
          text: requirement.raw,
          detail: `${recorded.kind} ref "${recorded.ref ?? "(none)"}" does not exist`,
        });
      }
      if (recorded.kind === "eslint" && !testTitles.has(requirement.text)) {
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
      counts[candidate.entry.kind] += 1;
      nextRequirements.push({ ...candidate.entry, doc, text: requirement.raw, hash: requirement.hash });
      issues.push({
        kind: "changed",
        doc,
        line: requirement.line,
        text: requirement.raw,
        hash: requirement.hash,
        detail: `was "${candidate.entry.text}" — re-verify ${candidate.entry.kind}${
          candidate.entry.ref ? ` ${candidate.entry.ref}` : ""
        }`,
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
      detail: `recorded as ${entry.kind}${entry.ref ? ` ${entry.ref}` : ""} but the bullet is gone`,
    });
  }

  const total = parsed.length;
  let mechanical = 0;
  for (const kind of MECHANICAL_KINDS) mechanical += counts[kind];

  return {
    counts,
    total,
    mechanical,
    issues,
    nextRegistry: { requirements: nextRequirements },
  };
}

export interface ClassifyInput {
  /** Hash of the requirement, as `coverage` prints it. */
  hash: string;
  kind: EnforcementKind;
  ref?: string;
  note?: string;
}

export interface ClassifyResult {
  registry: Registry;
  requirement: Requirement;
  /** The kind this requirement carried before, when it was already classified. */
  previousKind?: EnforcementKind;
}

/**
 * Records how a requirement is checked.
 *
 * Validates that the requirement exists in the documentation as written, that a
 * ref names a check that exists, and that the kinds which are meaningless
 * without an explanation carry one. Throws with a readable message otherwise, so
 * the caller can print it and exit.
 */
export function classifyRequirement(options: {
  docsRoot: string;
  registry: Registry;
  input: ClassifyInput;
}): ClassifyResult {
  const { docsRoot, registry, input } = options;

  const parsed = parseDocs(docsRoot).flatMap((doc) =>
    doc.requirements.map((requirement) => ({ doc: doc.doc, requirement })),
  );
  const match = parsed.find((entry) => entry.requirement.hash === input.hash);
  if (!match) {
    throw new Error(`No requirement in the documentation has hash "${input.hash}". Run coverage to list them.`);
  }

  const refs = refParts(input.ref);
  if (input.kind === "eslint") {
    if (refs.length === 0) throw new Error('Kind "eslint" needs --ref naming the rule that reports it.');
    const unknown = refs.filter((ref) => !allPasikaRuleIds.includes(ref));
    if (unknown.length > 0) {
      throw new Error(`--ref ${unknown.map((ref) => `"${ref}"`).join(", ")} is not a rule in the plugin.`);
    }
  } else if (input.kind !== "doctor" && refs.length > 0) {
    throw new Error(`Kind "${input.kind}" takes no --ref, because nothing reports it.`);
  }

  if ((input.kind === "judgment" || input.kind === "planned") && (input.note ?? "").trim() === "") {
    const reason = input.kind === "judgment" ? "why no check can decide it" : "the check that should cover it";
    throw new Error(`Kind "${input.kind}" needs --note naming ${reason}.`);
  }

  const requirement: Requirement = {
    doc: match.doc,
    text: match.requirement.raw,
    hash: match.requirement.hash,
    kind: input.kind,
    ...(refs.length > 0 ? { ref: refs.join(", ") } : {}),
    ...((input.note ?? "").trim() === "" ? {} : { note: input.note?.trim() }),
  };

  const existing = registry.requirements.find((entry) => entry.hash === input.hash);
  const requirements = registry.requirements.filter((entry) => entry.hash !== input.hash);
  requirements.push(requirement);

  return { registry: { requirements }, requirement, previousKind: existing?.kind };
}

export function readRegistry(registryPath: string): Registry {
  const parsed: unknown = JSON.parse(readFileSync(registryPath, "utf8"));
  const result = registrySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${registryPath} is not a valid enforcement registry:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/**
 * Sequence position of each requirement in the docs: doc order as `parseDocs`
 * yields it, then line order within each doc. Entries whose hash no longer
 * exists in the docs (removed, not yet accepted) sort after everything parsed.
 */
function buildDocOrder(docsRoot: string): Map<string, number> {
  const order = new Map<string, number>();
  let position = 0;
  for (const doc of parseDocs(docsRoot)) {
    for (const requirement of doc.requirements) {
      order.set(requirement.hash, position);
      position += 1;
    }
  }
  return order;
}

/**
 * Code-point order on doc then text. Deliberately not `localeCompare`, whose
 * result depends on the host's locale data — a generated file that is committed
 * has to sort the same way everywhere.
 */
function compareRequirements(left: Requirement, right: Requirement): number {
  if (left.doc !== right.doc) return left.doc < right.doc ? -1 : 1;
  if (left.text !== right.text) return left.text < right.text ? -1 : 1;
  return 0;
}

/**
 * Writes the registry sorted in the same order the requirements appear in the
 * docs: document order, then line order within each document.
 */
export function writeRegistry(registryPath: string, registry: Registry, docsRoot: string): void {
  const order = buildDocOrder(docsRoot);
  const withPosition = registry.requirements.map((requirement) => ({
    requirement,
    position: order.get(requirement.hash) ?? Number.MAX_SAFE_INTEGER,
  }));
  withPosition.sort((left, right) => {
    if (left.position !== right.position) return left.position - right.position;
    // Two entries with the same hash cannot coexist; this fallback orders
    // entries whose hash the docs no longer contain, deterministically.
    return compareRequirements(left.requirement, right.requirement);
  });
  const sorted: Registry = { requirements: withPosition.map((entry) => entry.requirement) };
  writeFileSync(registryPath, `${JSON.stringify(sorted, null, 2)}\n`);
}
