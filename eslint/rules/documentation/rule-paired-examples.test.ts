import { describe, documentationRuleTester } from "./rule-tester";
import { rulePairedExamplesRule } from "./rule-paired-examples";

void describe("A Rule MUST contain at least one Incorrect/Correct pair and MAY contain more than one.", () => {
  documentationRuleTester.run("rule-paired-examples", rulePairedExamplesRule, {
    valid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — Bad Name\n\n```\nBad\n```\n\n## Correct — Good Name\n\n```\nGood\n```",
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.",
        errors: [{ message: "0 Incorrect and 0 Correct examples" }],
      },
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — Bad Name\n\n```\nBad\n```",
        errors: [{ message: "1 Incorrect and 0 Correct examples" }],
      },
    ],
  });
});

void describe("Every level-2 heading in a Rule MUST be an `Incorrect — ...` or `Correct — ...` example heading.", () => {
  documentationRuleTester.run("rule-paired-examples", rulePairedExamplesRule, {
    valid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — Bad Name\n\n```\nBad\n```\n\n## Correct — Good Name\n\n```\nGood\n```",
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — Bad Name\n\n```\nBad\n```\n\n## Correct — Good Name\n\n```\nGood\n```\n\n## Extra Guidance\n\nMore prose.",
        errors: [{ message: "Rule level-2 heading must be an Incorrect/Correct example: Extra Guidance" }],
      },
    ],
  });
});
