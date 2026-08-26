import { describe, mdRuleTester } from "./rule-tester.js";
import { rulePairedExamplesRule } from "./rule-paired-examples.js";

void describe("A Rule MUST contain at least one Incorrect/Correct pair.", () => {
  mdRuleTester.run("rule-paired-examples", rulePairedExamplesRule, {
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
