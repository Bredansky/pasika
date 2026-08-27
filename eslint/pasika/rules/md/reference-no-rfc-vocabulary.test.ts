import { describe, mdRuleTester } from "./rule-tester";
import { referenceNoRfcVocabularyRule } from "./reference-no-rfc-vocabulary";

void describe("A Reference MUST NOT state a constraint the reader has to satisfy, even in plain declarative wording, and a constraint the reader has to satisfy MUST live in a Rule.", () => {
  mdRuleTester.run("reference-no-rfc-vocabulary", referenceNoRfcVocabularyRule, {
    valid: [
      // A lookup fact stated plainly, with no RFC vocabulary imposing the constraint.
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nFile names are kebab-case and end in `-reference`.",
      },
    ],
    invalid: [
      // A constraint stated with RFC vocabulary in a Reference is caught mechanically.
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nA feature folder MUST NOT hold ordinary components.",
        errors: [{ message: "reference uses RFC 2119 vocabulary: MUST NOT" }],
      },
    ],
  });
});

void describe("A Reference MUST NOT use RFC 2119 vocabulary (MUST, MUST NOT, SHOULD, SHOULD NOT, MAY), because lookup material describes what exists rather than imposing requirements.", () => {
  mdRuleTester.run("reference-no-rfc-vocabulary", referenceNoRfcVocabularyRule, {
    valid: [
      // Reference with plain prose - no RFC vocabulary
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nThis describes the feature.",
      },
      // RFC keyword in a code span is allowed
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nUse the `MUST` keyword in requirements.",
      },
      // Non-reference document - rule does not apply
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
      // RFC vocabulary in prose of a reference document
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nThis MUST be followed.",
        errors: [{ message: "reference uses RFC 2119 vocabulary: MUST" }],
      },
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nThis SHOULD NOT be used.",
        errors: [{ message: "reference uses RFC 2119 vocabulary: SHOULD NOT" }],
      },
      {
        filename: "my-reference.md",
        code: "# My Reference\n\nThis MAY be optional.",
        errors: [{ message: "reference uses RFC 2119 vocabulary: MAY" }],
      },
      // Multiple keywords in separate paragraphs
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
