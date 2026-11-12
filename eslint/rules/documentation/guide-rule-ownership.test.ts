import { guideRuleOwnershipRule } from "./guide-rule-ownership";
import { describe, documentationRuleTester } from "./rule-tester";

const guideFile = "docs/example-guide/example-guide.md";
const ownRule = "rules/own-rule.md";
const otherRule = "../other-guide/rules/other-rule.md";

void describe("A Guide MUST NOT link to a Rule outside its own `rules/` folder.", () => {
  documentationRuleTester.run("guide-rule-ownership", guideRuleOwnershipRule, {
    valid: [
      { filename: guideFile, code: `# Example Guide\n\n1. Read the [Rule](${ownRule}).` },
      { filename: guideFile, code: "# Example Guide\n\n1. Read the [Rule](./rules/own-rule.md#example)." },
      {
        filename: guideFile,
        code: "# Example Guide\n\n1. Read the [Reference](../other-guide/references/other-reference.md).",
      },
      {
        filename: guideFile,
        code: "# Example Guide\n\n1. Read [How To Build](../other-guide/other-guide.md#how-to-build).",
      },
      { filename: guideFile, code: "# Example Guide\n\n1. Visit [External Rule](https://example.com/other-rule.md)." },
      { filename: "docs/example-guide/references/note-reference.md", code: `[Rule](${otherRule})` },
    ],
    invalid: [
      {
        filename: guideFile,
        code: `# Example Guide\n\n1. Follow the [Other Rule](${otherRule}).`,
        errors: [{ message: `Guide links a Rule outside its own rules/ folder: ${otherRule}` }],
      },
      {
        filename: guideFile,
        code: "# Example Guide\n\n1. Follow the [Other Rule](../other-guide/rules/other-rule.md#details).",
        errors: [
          {
            message: "Guide links a Rule outside its own rules/ folder: ../other-guide/rules/other-rule.md#details",
          },
        ],
      },
      {
        filename: guideFile,
        code: "# Example Guide\n\n1. Follow the [Escaping Rule](rules/../../other-guide/rules/other-rule.md).",
        errors: [
          {
            message: "Guide links a Rule outside its own rules/ folder: rules/../../other-guide/rules/other-rule.md",
          },
        ],
      },
    ],
  });
});
