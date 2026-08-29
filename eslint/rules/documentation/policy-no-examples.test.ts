import { describe, documentationRuleTester } from "./rule-tester";
import { policyNoExamplesRule } from "./policy-no-examples";

void describe("A Policy document MUST NOT contain Incorrect/Correct examples, and a requirement that a reader cannot apply without one MUST live in a Rule instead.", () => {
  documentationRuleTester.run("policy-no-examples", policyNoExamplesRule, {
    valid: [{ filename: "foo-policy.md", code: "# Foo Policy\n\n- Values MUST be kebab-case." }],
    invalid: [
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\n## Incorrect — Bad Name\n\n```\nBad\n```",
        errors: [{ message: "policy document contains an example: Incorrect — Bad Name" }],
      },
    ],
  });
});
