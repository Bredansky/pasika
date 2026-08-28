import { allPasikaRuleIds } from "../../eslint/index";
import { parseDocs } from "./parse-docs";
import type { Registry, Requirement } from "../types";

export interface ClassifyInput {
  /** Hash of the requirement, as `coverage` prints it. */
  hash: string;
  /** Rule or doctor check ids that govern it, comma-separated; absent when judgment applies it. */
  ref?: string;
  /** How the requirement is met; required on every entry. */
  note?: string;
}

export interface ClassifyResult {
  registry: Registry;
  requirement: Requirement;
}

/** A requirement several checks cover lists them comma-separated. */
function refParts(ref: string | undefined): string[] {
  return (ref ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Records how a requirement is checked.
 *
 * Validates that the requirement exists in the documentation as written, that a
 * ref names a check that exists, and that an explanation is always present.
 * Throws with a readable message otherwise, so the caller can print it and exit.
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

  if ((input.note ?? "").trim() === "") {
    throw new Error("--note is required: how the ref'd check governs it, or how judgment applies it.");
  }

  const refs = refParts(input.ref);
  const unknown = refs.filter((ref) => !allPasikaRuleIds.includes(ref));
  if (unknown.length > 0) {
    throw new Error(`--ref ${unknown.map((ref) => `"${ref}"`).join(", ")} is not a rule or doctor check.`);
  }

  const requirement: Requirement = {
    doc: match.doc,
    text: match.requirement.raw,
    hash: match.requirement.hash,
    ...(refs.length > 0 ? { ref: refs.join(", ") } : {}),
    note: (input.note ?? "").trim(),
  };

  const requirements = registry.requirements.filter((entry) => entry.hash !== input.hash);
  requirements.push(requirement);

  return { registry: { requirements }, requirement };
}
