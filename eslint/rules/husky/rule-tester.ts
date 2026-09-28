/**
 * Shared RuleTester wiring for the husky/git-hook rule tests.
 */
import jsonPlugin from "@eslint/json";
import { describe, it } from "vitest";
import { huskyRules } from "../../index";
import { CwdAwareRuleTester } from "../../rule-tester";

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
