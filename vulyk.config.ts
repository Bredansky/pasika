/**
 * Vulyk Manifest Configuration
 *
 * Declares tracked documentation entries that `vulyk sync` and `vulyk agents`
 * install into consumer projects, plus the groups that control their behavior.
 *
 * This file provides type-checking and intellisense. The `vulyk.json` runtime
 * file is generated from it via `npm run build`.
 *
 * @see ../vulyk/src/types.ts for the canonical schema definitions.
 */

// ---------------------------------------------------------------------------
// Types (mirrors ../vulyk/src/types.ts — keep in sync)
// ---------------------------------------------------------------------------

/** An agent file name (e.g., AGENTS.md, CLAUDE.md). */
type AgentSpec = string;

/** Validation rules used by `vulyk add` to auto-detect which group an entry belongs to. */
interface Validate {
  mustContain?: string[];
  frontmatter?: string[];
  fileExtension?: string;
}

/** Doc-style fallback rule for entries with `targets` glob matching. */
interface DocRule {
  /** Glob patterns that match files this doc applies to. */
  match: string[];
  /** Where doc files install to. Defaults to ["docs/external"]. */
  outputPaths?: string[];
  /** Agent files to generate per target dir. */
  agents?: AgentSpec[];
  /** Whether installed files should be added to .gitignore. */
  gitIgnore?: boolean;
}

/** A named bundle of install behavior, validation, and output routing. */
interface Group {
  /** Where entries in this group install to by default. */
  outputPaths?: string[];
  /** Whitelist of enabled entry names. Empty/missing = all enabled. */
  enabled?: string[];
  /** Explicit opt-out entry names (beats `enabled`). */
  disabled?: string[];
  /** Whether installed files should be added to .gitignore. */
  gitIgnore?: boolean;
  /** Validation rules for auto-detection. */
  validate?: Validate;
  /** Doc-style fallback rules per output target. */
  rules?: Record<string, DocRule>;
  /** Default agent files to generate per target dir. */
  agents?: AgentSpec[];
}

/** A single tracked documentation source entry. */
interface Entry {
  /** Where to fetch from (local path or remote URL). */
  source: string;
  /** Optional group reference. Auto-detected if missing. */
  group?: string;
  /** Per-entry output path override. */
  outputPaths?: string[];
  /** Agent files to generate per target dir. First is primary. */
  agents?: AgentSpec[];
  /** Per-entry gitignore override. */
  gitIgnore?: boolean;
  /** Per-entry validate block (for auto-detection). */
  validate?: Validate;
  /** Which code paths / target dirs this doc applies to. */
  targets?: string[];
  /** Human-readable description shown in AGENTS.md. */
  description?: string;
}

/** A complete vulyk manifest: groups + entries + top-level fallbacks. */
interface Manifest {
  groups?: Record<string, Group>;
  entries?: Record<string, Entry>;
  outputPaths?: string[];
  enabled?: string[];
  disabled?: string[];
  gitIgnore?: boolean;
  agents?: AgentSpec[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const manifest = {
  groups: {
    docs: {
      outputPaths: ["docs/external"],
      validate: { fileExtension: ".md" },
      gitIgnore: true,
    },
  },
  entries: {
    "claude-hooks": {
      source: "docs/claude/hooks.md",
      group: "docs",
      outputPaths: ["claude/hooks"],
      targets: ["claude/hooks"],
      agents: ["AGENTS.md", "CLAUDE.md"],
      gitIgnore: false,
      description: "Shared Claude hooks shipped by pasika.",
    },
  },
} as const satisfies Manifest;

export default manifest;