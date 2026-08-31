/**
 * Shared RuleTester wiring for the markdown rule tests.
 *
 * Each `describe` title in a rule test is the exact text of the requirement the
 * case pins, which is how `pasika coverage` verifies that a requirement recorded
 * as lint-enforced has a test behind it.
 */
import { describe, it } from "node:test";
import markdown from "@eslint/markdown";
import { CwdAwareRuleTester } from "../../rule-tester";
import { documentationRules } from "../../index";

CwdAwareRuleTester.describe = describe;
CwdAwareRuleTester.it = it;

export const documentationRuleTester = new CwdAwareRuleTester({
  language: "markdown/gfm",
  plugins: {
    markdown,
    pasika: { rules: documentationRules },
  },
});

export { describe };
