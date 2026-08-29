/**
 * Shared RuleTester wiring for the CSS rule tests.
 *
 * Each `describe` title in a rule test is the exact text of the requirement the
 * case pins, which is how `pasika coverage` verifies that a requirement recorded
 * as lint-enforced has a test behind it.
 */
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import css from "@eslint/css";
import { tailwindRules } from "../../index";

RuleTester.describe = describe;
RuleTester.it = it;

export const tailwindRuleTester = new RuleTester({
  language: "css/css",
  languageOptions: { tolerant: true },
  plugins: {
    css,
    pasika: { rules: tailwindRules },
  },
});

export { describe };
