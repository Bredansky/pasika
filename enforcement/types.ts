/**
 * The enforcement registry — the record of how every documented requirement is
 * checked.
 *
 * A requirement is identified by the hash of its canonical text, not by a
 * hand-written id. Rewording a requirement therefore changes its hash, which
 * makes `pasika coverage` report it as changed until someone re-confirms that
 * the recorded enforcement still covers it.
 */
import { z } from "zod";

export const enforcementKindSchema = z.enum([
  /** An ESLint rule reports it. */
  "eslint",
  /** A `pasika doctor` check reports it. */
  "doctor",
  /** A `pasika docs` check reports it. */
  "docs-check",
  /** No mechanical check can decide it; a reviewer or agent applies it. */
  "judgment",
  /** The requirement grants permission, so there is nothing to check. */
  "permission",
  /** A mechanical check is possible but not written yet. */
  "planned",
]);

export const requirementSchema = z.object({
  /** Document path relative to the docs root. */
  doc: z.string(),
  /** Canonical requirement text: links flattened, code spans unwrapped, whitespace collapsed. */
  text: z.string(),
  /** Short hash of `text`. */
  hash: z.string(),
  kind: enforcementKindSchema,
  /**
   * Identifier of the check that covers this requirement: an ESLint rule id, a
   * doctor check id, or a docs-check id. Several ids are comma-separated.
   * Absent for judgment and permission.
   */
  ref: z.string().optional(),
  /**
   * For `judgment`, why no mechanical check can decide it. For `planned`, the
   * check that should cover it. For `eslint` and `doctor`, what the existing
   * check does not cover.
   */
  note: z.string().optional(),
});

export const registrySchema = z.object({
  requirements: z.array(requirementSchema),
});

export type EnforcementKind = z.infer<typeof enforcementKindSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type Registry = z.infer<typeof registrySchema>;

/** Every kind, in the order the coverage summary prints them. */
export const ENFORCEMENT_KINDS: EnforcementKind[] = [
  "eslint",
  "doctor",
  "docs-check",
  "planned",
  "judgment",
  "permission",
];

/** The kinds that count as mechanically enforced today. */
export const MECHANICAL_KINDS: EnforcementKind[] = ["eslint", "doctor", "docs-check"];
