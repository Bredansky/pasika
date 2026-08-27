import { describe, mdRuleTester } from "./rule-tester";
import { guideLinkAnchorsRule } from "./guide-link-anchors";

void describe("A step that links another Guide MUST link directly to the relevant How To section.", () => {
  mdRuleTester.run("guide-link-anchors", guideLinkAnchorsRule, {
    valid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [other guide](other-guide.md#how-to-do-it).",
      },
    ],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [other guide](other-guide.md).",
        errors: [{ message: "guide link other-guide.md does not point to a specific section" }],
      },
    ],
  });
});
