import { describe, documentationRuleTester } from "./rule-tester";
import { guideStepSingleSentenceRule } from "./guide-step-single-sentence";

void describe("Each How To step MUST be concise and use one sentence.", () => {
  documentationRuleTester.run("guide-step-single-sentence", guideStepSingleSentenceRule, {
    valid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Open the file.\n2. Save it.",
      },
    ],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Open the file. Then edit it.",
        errors: [{ message: "step uses 2 sentences" }],
      },
    ],
  });
});
