import { describe, mdRuleTester } from "./rule-tester";
import { policySubjectHeadingsRule } from "./policy-subject-headings";

void describe("A Policy document MUST group its bullets under a heading per subject.", () => {
  mdRuleTester.run("policy-subject-headings", policySubjectHeadingsRule, {
    valid: [
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\nTwo short sentences. They are concise.\n\n## Naming\n\n- Values MUST be kebab-case.",
      },
    ],
    invalid: [
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\nTwo short sentences. They are concise.\n\n- Values MUST be kebab-case.\n\n## Naming\n\n- Names MUST be short.",
        errors: [{ message: "policy bullet appears before the first subject heading" }],
      },
    ],
  });
});
