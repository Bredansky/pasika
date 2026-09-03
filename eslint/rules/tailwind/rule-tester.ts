/**
 * Shared RuleTester wiring for the CSS rule tests.
 *
 * Each `describe` title in a rule test is the exact text of the requirement the
 * case pins, which is how `pasika coverage` verifies that a requirement recorded
 * as lint-enforced has a test behind it.
 */
import { describe, it } from "vitest";
import css from "@eslint/css";
import { CwdAwareRuleTester } from "../../rule-tester";
import { tailwindRules } from "../../index";

CwdAwareRuleTester.describe = describe;
CwdAwareRuleTester.it = it;

export const tailwindRuleTester = new CwdAwareRuleTester({
  language: "css/css",
  languageOptions: { tolerant: true },
  plugins: {
    css,
    pasika: { rules: tailwindRules },
  },
});

export { describe };
