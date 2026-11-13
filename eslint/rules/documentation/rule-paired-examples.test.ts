import { rulePairedExamplesRule } from "./rule-paired-examples";
import { describe, documentationRuleTester } from "./rule-tester";

void describe("A Rule MUST contain at least one Incorrect/Correct pair and MAY contain more than one.", () => {
  documentationRuleTester.run("rule-paired-examples", rulePairedExamplesRule, {
    valid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — Bad Name\n\n```\nBad\n```\n\n## Correct — Good Name\n\n```\nGood\n```",
      },
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — First\n\n## Correct — First\n\n## Incorrect — Second\n\n## Correct — Second",
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.",
        errors: [{ message: "0 Incorrect and 0 Correct examples" }],
      },
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — Bad Name\n\n```\nBad\n```",
        errors: [{ message: "1 Incorrect and 0 Correct examples" }],
      },
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — First\n\n## Incorrect — Second\n\n## Correct — First\n\n## Correct — Second",
        errors: [
          { message: 'Rule examples must alternate Incorrect then Correct; found "Incorrect — Second" at line 7.' },
        ],
      },
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Correct — First\n\n## Incorrect — First",
        errors: [
          { message: 'Rule examples must alternate Incorrect then Correct; found "Correct — First" at line 5.' },
        ],
      },
    ],
  });
});

void describe("Every level-2 heading in a Rule MUST be an `Incorrect — ...` or `Correct — ...` example heading.", () => {
  documentationRuleTester.run("rule-paired-examples", rulePairedExamplesRule, {
    valid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — Bad Name\n\n```\nBad\n```\n\n## Correct — Good Name\n\n```\nGood\n```",
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n- Values MUST be kebab-case.\n\n## Incorrect — Bad Name\n\n```\nBad\n```\n\n## Correct — Good Name\n\n```\nGood\n```\n\n## Extra Guidance\n\nMore prose.",
        errors: [{ message: "Rule level-2 heading must be an Incorrect/Correct example: Extra Guidance" }],
      },
    ],
  });
});

void describe("A Rule MUST place its first Incorrect/Correct example immediately after the requirement bullet list, without intervening prose or other blocks.", () => {
  const heading = "# Foo Rule\n\nThis rule keeps helpers named.\n\n- A helper MUST be exported.\n";
  const examples =
    "\n## Incorrect — Default Export\n\n```ts\nexport default 1;\n```\n\nWhy: default exports hide names.\n\n## Correct — Named Export\n\n```ts\nexport const one = 1;\n```\n\nWhy: named exports are visible.\n";
  const MESSAGE = "Rule requirements must be followed directly by the first Incorrect/Correct example";

  documentationRuleTester.run("rule-paired-examples", rulePairedExamplesRule, {
    valid: [
      { filename: "foo-rule.md", code: `${heading}${examples}` },
      {
        filename: "foo-rule.md",
        code: `# Foo Rule\n\nThis rule keeps helpers named.\n\n- A helper MUST have a name that\n  stays stable across modules.\n${examples}`,
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: `${heading}  The rule also detects exported class-name maps reused through custom components.\n${examples}`,
        errors: [{ message: MESSAGE }],
      },
      {
        filename: "foo-rule.md",
        code: `${heading}\nExtra explanation of the rule.\n${examples}`,
        errors: [{ message: MESSAGE }],
      },
      {
        filename: "foo-rule.md",
        code: `${heading}\n> Side note after requirements.\n${examples}`,
        errors: [{ message: MESSAGE }],
      },
      {
        filename: "foo-rule.md",
        code: `${heading}\n\`\`\`ts\nconst extra = true;\n\`\`\`\n${examples}`,
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});

void describe("A Rule MUST keep all requirement bullets in one uninterrupted list without blank lines between bullets.", () => {
  const start = "# Foo Rule\n\nThis rule keeps names consistent.\n\n";
  const examples =
    "\n## Incorrect — Alias\n\n\x60\x60\x60ts\nconst bad = value;\n\x60\x60\x60\n\nWhy: the alias obscures its source.\n\n## Correct — Direct Read\n\n\x60\x60\x60ts\nuse(value);\n\x60\x60\x60\n\nWhy: the name stays clear.";
  const MESSAGE = "Rule requirement bullets must form one uninterrupted list without blank lines";

  documentationRuleTester.run("rule-paired-examples:requirement-list", rulePairedExamplesRule, {
    valid: [
      {
        filename: "foo-rule.md",
        code: `${start}- Names MUST be consistent.\n- Aliases MUST NOT rename names.\n${examples}`,
      },
      { filename: "foo-rule.md", code: `${start}- Names MUST be consistent.\n${examples}` },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: `${start}- Names MUST be consistent.\n\n- Aliases MUST NOT rename names.\n${examples}`,
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});

void describe("A `Why:` explanation MUST be the final block of its example, followed only by the next Incorrect/Correct heading or the end of the Rule.", () => {
  const start = "# Foo Rule\n\nThis rule keeps names consistent.\n\n- Names MUST be consistent.\n";
  const bad =
    "\n## Incorrect — Alias\n\n\x60\x60\x60ts\nconst bad = value;\n\x60\x60\x60\n\nWhy: the alias obscures its source.";
  const good = "\n## Correct — Direct Read\n\n\x60\x60\x60ts\nuse(value);\n\x60\x60\x60\n\nWhy: the name stays clear.";
  const MESSAGE = "A Why explanation must be the final block of its example";

  documentationRuleTester.run("rule-paired-examples:why-last", rulePairedExamplesRule, {
    valid: [
      { filename: "foo-rule.md", code: start + bad + good },
      {
        filename: "foo-rule.md",
        code: `${
          start
        }\n## Incorrect — Alias\n\nAn introduction to the example.\n\n\x60\x60\x60ts\nconst bad = value;\n\x60\x60\x60\n\nWhy: the alias obscures its source.${
          good
        }`,
      },
      {
        filename: "foo-rule.md",
        code: `${
          start
        }\n## Incorrect — Alias\n\n\x60\x60\x60md\nWhy: unrelated text.\n\x60\x60\x60\n\nWhy: the alias obscures its source.${
          good
        }`,
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: `${start + bad}\n\nAn unrelated exception.${good}`,
        errors: [{ message: MESSAGE }],
      },
      {
        filename: "foo-rule.md",
        code: `${start + bad + good}\n\nAppended prose after the final Why.`,
        errors: [{ message: MESSAGE }],
      },
      {
        filename: "foo-rule.md",
        code: `${start + bad}\n\n\x60\x60\x60ts\nconst extra = true;\n\x60\x60\x60${good}`,
        errors: [{ message: MESSAGE }],
      },
      {
        filename: "foo-rule.md",
        code: `${start + bad}\n\n- Another requirement MUST be added.${good}`,
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});

void describe("Every level-2 heading in a Rule MUST be an `Incorrect — ...` or `Correct — ...` example heading.", () => {
  const filename = "global-stylesheet-rule.md";
  const prefix =
    "# Global Stylesheet Rule\n\nStyles must remain explicit.\n\n- CSS selectors MUST NOT use attributes.\n\n";
  const earlier =
    '## Incorrect — Attribute Selector\n\n```css\n[data-state=open] { display: block; }\n```\n\nWhy: attribute matching hides styling.\n\n## Correct — Utility on Element\n\n```tsx\n<div className="block" />\n```\n\nWhy: the utility is explicit.\n';
  documentationRuleTester.run("rule-paired-examples:attribute-selector-regression", rulePairedExamplesRule, {
    valid: [{ filename, code: prefix + earlier }],
    invalid: [
      {
        filename,
        code: `${prefix}${earlier}\n## Attribute Selector Example\n\nIncorrect: attribute selectors.\n\nCorrect: utility classes.\n`,
        errors: [{ message: "Rule level-2 heading must be an Incorrect/Correct example: Attribute Selector Example" }],
      },
    ],
  });
});
