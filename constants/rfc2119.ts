/**
 * RFC 2119 vocabulary used across the project.
 *
 * Single source of truth for both the documentation lint rules (`eslint/`)
 * and the docs parser (`scripts/`). Only the five keywords the documentation
 * guide actually uses are included: MUST, MUST NOT, SHOULD, SHOULD NOT, MAY.
 * Alternatives such as SHALL, REQUIRED, and OPTIONAL are valid RFC 2119 words
 * but are not part of this project's vocabulary.
 *
 * Ordered longest-first so multi-word phrases like `MUST NOT` win over their
 * prefix `MUST` when matched with a regex alternation.
 */
export const RFC_2119_KEYWORDS = ["MUST NOT", "MUST", "SHOULD NOT", "SHOULD", "MAY"] as const;

/**
 * Matches the first RFC 2119 keyword in a string, longest first so `MUST NOT`
 * wins over `MUST`. The named `keyword` capture group holds the matched word.
 */
export const RFC_2119_PATTERN = new RegExp(`\\b(?<keyword>${RFC_2119_KEYWORDS.join("|")})\\b`);
