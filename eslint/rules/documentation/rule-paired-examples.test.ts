import { rulePairedExamplesRule } from "./rule-paired-examples";
import { describe, documentationRuleTester } from "./rule-tester";

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

void describe("A Rule MUST place its first Incorrect/Correct example immediately after the requirement bullet list, without intervening prose or other blocks.", () => {
  const heading = "# Foo Rule\n\nThis rule keeps helpers named.\n\n- A helper MUST be exported.\n";
  const examples =
    "\n## Incorrect — Default Export\n\n```ts\nexport default 1;\n```\n\nWhy: default exports hide names.\n\n## Correct — Named Export\n\n```ts\nexport const one = 1;\n```\n\nWhy: named exports are visible.\n";
  const MESSAGE = "Rule requirements must be followed directly by the first Incorrect/Correct example";

  documentationRuleTester.run("rule-paired-examples", rulePairedExamplesRule, {
    valid: [{ filename: "foo-rule.md", code: `${heading}${examples}` }],
    invalid: [
      {
        filename: "foo-rule.md",
        code: `${heading}\nExtra explanation of the rule.\n${examples}`,
        errors: [{ message: MESSAGE }],
      },
      {
        filename: "foo-rule.md",
        code: `${heading}\n> Side note after requirements.\n${examples}`,
        errors: [{ message: MESSAGE }],
      },
      {
        filename: "foo-rule.md",
        code: `${heading}\n\`\`\`ts\nconst extra = true;\n\`\`\`\n${examples}`,
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
