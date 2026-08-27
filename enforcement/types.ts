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
  /** No mechanical check decides it; the reviewer or agent applies it, or the requirement merely grants permission. */
  "manual",
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
   * Identifier of the check that covers or governs this requirement: an ESLint
   * rule id or a doctor check id. Several ids are comma-separated.
   * For `manual`, names the rule that governs the requirement's subject (e.g.
   * its placement) without deciding it; `note` says what the rule does and what
   * stays judgment. Absent for planned.
   */
  ref: z.string().optional(),
  /**
   * For `manual`, why no mechanical check decides it (or that it merely
   * grants permission). For `planned`, the check that should cover it. For
   * `eslint` and `doctor`, what the existing check does not cover.
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
export const ENFORCEMENT_KINDS: EnforcementKind[] = ["eslint", "doctor", "planned", "manual"];

/** The kinds that count as mechanically enforced today. */
export const MECHANICAL_KINDS: EnforcementKind[] = ["eslint", "doctor"];
