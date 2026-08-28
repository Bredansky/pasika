import { describe, mdRuleTester } from "./rule-tester";
import { requirementPresentRule } from "./requirement-present";

void describe("A Policy document MUST state every requirement as a bullet that uses RFC 2119 vocabulary.", () => {
  mdRuleTester.run("requirement-present", requirementPresentRule, {
    valid: [{ filename: "foo-policy.md", code: "# Foo Policy\n\n- Values MUST be kebab-case." }],
    invalid: [
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\n- Values are kebab-case.",
        errors: [{ message: "policy document states no requirement" }],
      },
    ],
  });
});

void describe("A Rule MUST contain at least one bullet point that uses RFC 2119 vocabulary (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY).", () => {
  mdRuleTester.run("requirement-present", requirementPresentRule, {
    valid: [{ filename: "foo-rule.md", code: "# Foo Rule\n\n- Values MUST be kebab-case." }],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values are kebab-case.",
        errors: [{ message: "rule document states no requirement" }],
      },
    ],
  });
});
