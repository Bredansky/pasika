import { describe, mdRuleTester } from "./rule-tester";
import { guideStepSingleLinkRule } from "./guide-step-single-link";

void describe("Each How To step MUST link at most one documentation file total, whatever kind that file is.", () => {
  mdRuleTester.run("guide-step-single-link", guideStepSingleLinkRule, {
    valid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [Rule](rule.md).\n2. Save it.",
      },
    ],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [Rule](rule.md) and the [Guide](other-guide.md).",
        errors: [{ message: "step links 2 documents" }],
      },
    ],
  });
});
