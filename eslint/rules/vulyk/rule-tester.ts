/**
 * Shared RuleTester wiring for the vulyk rules.
 */
import { describe, it } from "node:test";
import jsonPlugin from "@eslint/json";
import { CwdAwareRuleTester } from "../../rule-tester";
import { vulykRules } from "./index";

CwdAwareRuleTester.describe = describe;
CwdAwareRuleTester.it = it;

export const vulykRuleTester = new CwdAwareRuleTester({
  language: "json/json",
  plugins: {
    json: { languages: { json: jsonPlugin.languages.json } },
    pasika: { rules: vulykRules },
  },
});

export { describe };
