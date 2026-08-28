/**
 * Shared RuleTester wiring for the package.json rule tests.
 *
 * Each `describe` title in a rule test is the exact text of the requirement the
 * case pins, which is how `pasika coverage` verifies that a requirement recorded
 * as lint-enforced has a test behind it.
 */
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import jsonPlugin from "@eslint/json";
import { repoPackageJsonRules, nextPackageJsonRules } from "../../index";

RuleTester.describe = describe;
RuleTester.it = it;

export const packageJsonRuleTester = new RuleTester({
  language: "json/json",
  plugins: {
    json: { languages: { json: jsonPlugin.languages.json } },
    pasika: { rules: { ...repoPackageJsonRules, ...nextPackageJsonRules } },
  },
});

export { describe };
