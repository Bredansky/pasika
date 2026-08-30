import { describe, documentationRuleTester } from "./rule-tester";
import { referenceNoRfcVocabularyRule } from "./reference-no-rfc-vocabulary";

void describe("A Reference MUST NOT state a constraint the reader has to satisfy — in RFC 2119 vocabulary or in plain declarative wording — and such a constraint MUST live in a Rule.", () => {
  documentationRuleTester.run("reference-no-rfc-vocabulary", referenceNoRfcVocabularyRule, {
    valid: [
      // A lookup fact stated plainly, with no RFC vocabulary imposing a constraint.
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nFile names are kebab-case and end in `-reference`.",
      },
      // RFC keyword in a code span is allowed — naming a keyword is not a constraint.
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nUse the `MUST` keyword in requirements.",
      },
      // Non-reference document — the rule does not apply.
      {
        filename: "my-guide.md",
        code: "# My Guide\n\nThis MUST be followed.",
      },
      {
        filename: "my-rule.md",
        code: "# My Rule\n\nThis MUST be followed.",
      },
    ],
    invalid: [
      // A constraint stated with RFC vocabulary in a Reference is caught mechanically.
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nA feature folder MUST NOT hold ordinary components.",
        errors: [{ message: "reference uses RFC 2119 vocabulary: MUST NOT" }],
      },
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nThis SHOULD NOT be used.",
        errors: [{ message: "reference uses RFC 2119 vocabulary: SHOULD NOT" }],
      },
      // Multiple RFC-worded constraints in separate paragraphs.
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nThis MUST be followed.\n\nThis SHOULD be used.",
        errors: [
          { message: "reference uses RFC 2119 vocabulary: MUST" },
          { message: "reference uses RFC 2119 vocabulary: SHOULD" },
        ],
      },
    ],
  });
});
