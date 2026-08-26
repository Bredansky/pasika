/**
 * Shared RuleTester wiring for the markdown rule tests.
 *
 * Each `describe` title in a rule test is the exact text of the requirement the
 * case pins, which is how `pasika coverage` verifies that a requirement recorded
 * as lint-enforced has a test behind it.
 */
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import markdown from "@eslint/markdown";
import { pasikaMdRules } from "../../index.js";

RuleTester.describe = describe;
RuleTester.it = it;

export const mdRuleTester = new RuleTester({
  language: "markdown/gfm",
  plugins: {
    markdown,
    pasika: { rules: pasikaMdRules },
  },
});

export { describe };
