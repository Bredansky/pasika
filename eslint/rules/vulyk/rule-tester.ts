/**
 * Shared RuleTester wiring for the vulyk rules.
 */
import { describe, it } from "node:test";
import { RuleTester } from "eslint";
import jsonPlugin from "@eslint/json";
import { vulykRules } from "./index";

RuleTester.describe = describe;
RuleTester.it = it;

export const vulykRuleTester = new RuleTester({
  language: "json/json",
  plugins: {
    json: { languages: { json: jsonPlugin.languages.json } },
    pasika: { rules: vulykRules },
  },
});

export { describe };
