import { describe, documentationRuleTester } from "./rule-tester";
import { guideStepSingleLinkRule } from "./guide-step-single-link";

void describe("Each How To step MUST link at most one documentation file total, whatever kind that file is.", () => {
  documentationRuleTester.run("guide-step-single-link", guideStepSingleLinkRule, {
    valid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [Rule](rule.md).\n2. Save it.",
      },
      {
        // A single link into a section still counts once.
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [Rule](rule.md#values).\n2. Save it.",
      },
    ],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [Rule](rule.md) and the [Guide](other-guide.md).",
        errors: [{ message: "step links 2 documents" }],
      },
      {
        // An anchored link is still a link, so a second one is still a second link.
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [Rule](rule.md#values) and the [Guide](other-guide.md#how-to-do-it).",
        errors: [{ message: "step links 2 documents" }],
      },
    ],
  });
});
