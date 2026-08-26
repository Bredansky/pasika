import { describe, mdRuleTester } from "./rule-tester.js";
import { exampleHeadingDescriptionRule } from "./example-heading-description.js";

void describe("An Incorrect/Correct pair MUST add a concise description after an em dash in both headings, so readers can scan the examples by decision.", () => {
  mdRuleTester.run("example-heading-description", exampleHeadingDescriptionRule, {
    valid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — Bad Name\n\n```\nBad\n```\n\n## Correct — Good Name\n\n```\nGood\n```",
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect\n\n```\nBad\n```",
        errors: [{ message: "example heading has no em-dash description: Incorrect" }],
      },
    ],
  });
});
