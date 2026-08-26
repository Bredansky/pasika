import { describe, mdRuleTester } from "./rule-tester.js";
import { guideStepSingleSentenceRule } from "./guide-step-single-sentence.js";

void describe("Each How To step MUST be concise and use one sentence.", () => {
  mdRuleTester.run("guide-step-single-sentence", guideStepSingleSentenceRule, {
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
