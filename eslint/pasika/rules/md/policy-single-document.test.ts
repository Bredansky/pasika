import { describe, mdRuleTester } from "./rule-tester.js";
import { policySingleDocumentRule } from "./policy-single-document.js";

void describe("A repository MUST NOT have more than one Policy document per audience.", () => {
  mdRuleTester.run("policy-single-document", policySingleDocumentRule, {
    valid: [{ filename: "foo-policy.md", code: "# Foo Policy\n\n- Values MUST be kebab-case." }],
    invalid: [],
  });
});
