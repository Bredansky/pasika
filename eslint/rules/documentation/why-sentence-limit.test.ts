import { describe, documentationRuleTester } from "./rule-tester";
import { whySentenceLimitRule } from "./why-sentence-limit";

void describe("A `Why:` explanation MUST contain no more than two sentences.", () => {
  documentationRuleTester.run("why-sentence-limit", whySentenceLimitRule, {
    valid: [
      { filename: "foo-rule.md", code: "Why: the example is valid." },
      { filename: "foo-rule.md", code: "Why: the example is valid. It follows the rule." },
      { filename: "foo-rule.md", code: "Why: the value is 0.5 and the file is \u0060global.ts\u0060. This is safe." },
      { filename: "foo-rule.md", code: "Why: the \u0060.\u0060 is a directory marker, not a sentence. This is safe." },
      { filename: "foo-rule.md", code: "Why: options such as e.g. shorter labels are accepted. They remain clear." },
      {
        filename: "foo-rule.md",
        code: "Why: the first reason spans\nmultiple lines. The second reason follows.",
      },
      {
        filename: "foo-rule.md",
        code: "\u0060\u0060\u0060markdown\nWhy: First. Second. Third.\n\u0060\u0060\u0060",
      },
      { filename: "foo-guide.md", code: "Why: First. Second. Third." },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "Why: First reason. Second reason. Third reason.",
        errors: [{ message: "Why explanation has 3 sentences; maximum is 2." }],
      },
      {
        filename: "foo-rule.md",
        code: "Why: First line.\nSecond line.\nThird line.",
        errors: [{ message: "Why explanation has 3 sentences; maximum is 2." }],
      },
      {
        filename: "foo-rule.md",
        code: "## Correct — Example\n\n\u0060\u0060\u0060ts\nconst a = 1;\n\u0060\u0060\u0060\n\nWhy: One. Two! Three?",
        errors: [{ message: "Why explanation has 3 sentences; maximum is 2." }],
      },
      {
        filename: "foo-rule.md",
        code: "Why: First. Second. Third without a period",
        errors: [{ message: "Why explanation has 3 sentences; maximum is 2." }],
      },
    ],
  });
});
