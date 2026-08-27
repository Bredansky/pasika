import { describe, mdRuleTester } from "./rule-tester";
import { referenceBlockHeadingsRule } from "./reference-block-headings";

void describe("A Reference with a single lookup block MUST NOT add a section heading for it.", () => {
  mdRuleTester.run("reference-block-headings", referenceBlockHeadingsRule, {
    valid: [
      // A single unheaded lookup block
      { filename: "foo-reference.md", code: "# Foo Reference\n\nA lookup block without a heading." },
    ],
    invalid: [
      {
        filename: "foo-reference.md",
        code: "# Foo Reference\n\n## Term\n\nA lookup block with a heading.",
        errors: [
          {
            message:
              "reference has exactly one section heading, so either a single block is headed or a first block is not",
          },
        ],
      },
    ],
  });
});

void describe("A Reference with two or more lookup blocks MUST add a section heading for every block, including the first.", () => {
  mdRuleTester.run("reference-block-headings", referenceBlockHeadingsRule, {
    valid: [
      {
        filename: "foo-reference.md",
        code: "# Foo Reference\n\n## First Term\n\nFirst lookup.\n\n## Second Term\n\nSecond lookup.",
      },
    ],
    invalid: [],
  });
});
