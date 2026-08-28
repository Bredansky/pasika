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

export const requirementSchema = z.object({
  /** Document path relative to the docs root. */
  doc: z.string(),
  /** Canonical requirement text: links flattened, code spans unwrapped, whitespace collapsed. */
  text: z.string(),
  /** Short hash of `text`. */
  hash: z.string(),
  /**
   * Identifier of the rule or doctor check that governs this requirement, or
   * absent when a reviewer or agent applies it by hand. Several ids are
   * comma-separated.
   */
  ref: z.string().optional(),
  /**
   * How the requirement is met: what the ref'd check does and where it falls
   * short, or — with no ref — how a reviewer or agent applies it.
   */
  note: z.string(),
});

export const registrySchema = z.object({
  requirements: z.array(requirementSchema),
});

export type Requirement = z.infer<typeof requirementSchema>;
export type Registry = z.infer<typeof registrySchema>;
