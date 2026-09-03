/**
 * Shared RuleTester wiring for the husky/git-hook rule tests.
 */
import { describe, it } from "vitest";
import jsonPlugin from "@eslint/json";
import { CwdAwareRuleTester } from "../../rule-tester";
import { huskyRules } from "../../index";

CwdAwareRuleTester.describe = describe;
CwdAwareRuleTester.it = it;

export const huskyRuleTester = new CwdAwareRuleTester({
  language: "json/json",
  plugins: {
    json: { languages: { json: jsonPlugin.languages.json } },
    pasika: { rules: huskyRules },
  },
});

export { describe };
