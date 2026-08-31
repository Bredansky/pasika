/**
 * Shared RuleTester wiring for the package.json rule tests.
 *
 * Each `describe` title in a rule test is the exact text of the requirement the
 * case pins, which is how `pasika coverage` verifies that a requirement recorded
 * as lint-enforced has a test behind it.
 */
import { describe, it } from "node:test";
import jsonPlugin from "@eslint/json";
import { CwdAwareRuleTester } from "../../rule-tester";
import { repoPackageJsonRules, nextjsPackageJsonRules } from "../../index";

CwdAwareRuleTester.describe = describe;
CwdAwareRuleTester.it = it;

export const packageJsonRuleTester = new CwdAwareRuleTester({
  language: "json/json",
  plugins: {
    json: { languages: { json: jsonPlugin.languages.json } },
    pasika: { rules: { ...repoPackageJsonRules, ...nextjsPackageJsonRules } },
  },
});

export { describe };
