/**
 * Shared RuleTester wiring for the husky/git-hook rule tests.
 */
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import jsonPlugin from "@eslint/json";
import { huskyRules } from "../../index";

RuleTester.describe = describe;
RuleTester.it = it;

export const huskyRuleTester = new RuleTester({
  language: "json/json",
  plugins: {
    json: { languages: { json: jsonPlugin.languages.json } },
    pasika: { rules: huskyRules },
  },
});

export { describe };