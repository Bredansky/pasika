import { describe, mdRuleTester } from "./rule-tester.js";
import { noNestedHowToRule } from "./no-nested-how-to.js";

void describe("How To sections MUST NOT nest inside other How To sections.", () => {
  mdRuleTester.run("no-nested-how-to", noNestedHowToRule, {
    valid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Open the file.\n\n## How To Fix It\n\n1. Close it.",
      },
    ],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n### How To Do It Faster\n\n1. Open the file.",
        errors: [{ message: 'How To section "How To Do It Faster" nests inside another How To section' }],
      },
    ],
  });
});
