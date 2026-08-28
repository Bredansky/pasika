/**
 * Shared RuleTester wiring for the rule fixture tests.
 *
 * Each `describe` title in a rule test is the exact text of the requirement the
 * case pins, which is how `pasika coverage` verifies that a requirement recorded
 * as lint-enforced has a test behind it.
 */
import path from "node:path";
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

RuleTester.describe = describe;
RuleTester.it = it;

export const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

/** Absolute path inside the repository's notional `src/`, which the path-based rules resolve against. */
export function srcFile(relativePath: string): string {
  return path.resolve("src", relativePath);
}

export { describe };
