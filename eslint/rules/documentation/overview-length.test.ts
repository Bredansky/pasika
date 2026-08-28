import { describe, documentationRuleTester } from "./rule-tester";
import { overviewLengthRule } from "./overview-length";

void describe("A Policy overview MUST contain one or two short sentences naming the scope the requirements apply to.", () => {
  documentationRuleTester.run("overview-length", overviewLengthRule, {
    valid: [{ filename: "foo-policy.md", code: "# Foo Policy\n\nTwo sentences here. They are short." }],
    invalid: [
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\nThree sentences here. The first is short. The second is short.",
        errors: [{ message: "overview uses 3 sentences, at most two are allowed" }],
      },
    ],
  });
});

void describe("A Reference overview and the overview of each headed lookup block MUST contain one or two short sentences.", () => {
  documentationRuleTester.run("overview-length", overviewLengthRule, {
    valid: [{ filename: "foo-reference.md", code: "# Foo Reference\n\nTwo sentences here. They are short." }],
    invalid: [
      {
        filename: "foo-reference.md",
        code: "# Foo Reference\n\nThree sentences here. The first is short. The second is short.",
        errors: [{ message: "overview uses 3 sentences, at most two are allowed" }],
      },
    ],
  });
});

void describe("A Rule overview MUST contain one or two short sentences naming the problem the rule solves.", () => {
  documentationRuleTester.run("overview-length", overviewLengthRule, {
    valid: [{ filename: "foo-rule.md", code: "# Foo Rule\n\nTwo sentences here. They are short." }],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\nThree sentences here. The first is short. The second is short.",
        errors: [{ message: "overview uses 3 sentences, at most two are allowed" }],
      },
    ],
  });
});
