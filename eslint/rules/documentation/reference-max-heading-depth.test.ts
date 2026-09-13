import { describe, documentationRuleTester } from "./rule-tester";
import { referenceMaxHeadingDepthRule } from "./reference-max-heading-depth";

void describe("A Reference MUST NOT use a heading deeper than level 2.", () => {
  documentationRuleTester.run("reference-max-heading-depth", referenceMaxHeadingDepthRule, {
    valid: [
      // Level 1 title and level 2 section headings only.
      {
        filename: "foo-reference.md",
        code: "# Foo Reference\n\n## First Term\n\nFirst lookup.\n\n## Second Term\n\nSecond lookup.",
      },
      // A level 3 heading outside a -reference.md file is not this rule's concern.
      { filename: "foo-rule.md", code: "# Foo Rule\n\n## Correct — Example\n\n### Nested\n\nSome text." },
    ],
    invalid: [
      {
        filename: "foo-reference.md",
        code: "# Foo Reference\n\n## Hand-Authored Helpers\n\n### `cn` — Class Merging\n\nSome text.",
        errors: [
          { message: "reference heading is deeper than level 2; flatten it into the section it would nest under" },
        ],
      },
    ],
  });
});
