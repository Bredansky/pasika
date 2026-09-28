/**
 * Shared RuleTester wiring for the markdown rule tests.
 *
 * Each `describe` title in a rule test is the exact text of the requirement the
 * case pins, which is how `pasika coverage` verifies that a requirement recorded
 * as lint-enforced has a test behind it.
 */
import markdown from "@eslint/markdown";
import { describe, it } from "vitest";
import { documentationRules } from "../../index";
import { CwdAwareRuleTester } from "../../rule-tester";

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
