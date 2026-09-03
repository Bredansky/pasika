import { describe, documentationRuleTester } from "./rule-tester";
import { guideSectionShapeRule } from "./guide-section-shape";

void describe("A Guide MUST contain one or more level-two sections whose headings start with `How To `.", () => {
  documentationRuleTester.run("guide-section-shape", guideSectionShapeRule, {
    valid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\nOverview.\n\n## How To Do It\n\nRun this to update the file.\n\n1. Open the file.\n2. Save it.",
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Build\n\nRun this before shipping.\n\n1. Build it.\n\n## How To Ship\n\nRun this after building.\n\n1. Ship it.",
      },
      {
        filename: "notes.md",
        code: "# Notes\n\n## Reference\n\nPlain prose.",
      },
    ],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## Workflow\n\nRun this when needed.\n\n1. Run it.",
        errors: [{ message: 'guide section heading "Workflow" must start with "How To "' }],
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n### How To Run It\n\nRun this when needed.\n\n1. Run it.",
        errors: [{ message: 'guide section heading "How To Run It" must be level two' }],
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\nOverview only.",
        errors: [{ message: "guide must contain at least one How To section" }],
      },
    ],
  });
});

void describe("Every Guide section MUST consist of its overview followed by exactly one numbered list of steps.", () => {
  documentationRuleTester.run("guide-section-shape", guideSectionShapeRule, {
    valid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Run It\n\nUse this workflow when needed.\n\n1. Run it.",
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Compare It\n\nUse this workflow to compare styles.\n\n1. Compare the source and target.\n\n   ```css\n   .source {}\n   ```\n\n   ```css\n   .target {}\n   ```",
      },
    ],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Run It\n\nUse this workflow when needed.\n\n- Run it.",
        errors: [
          {
            message: 'guide section "How To Run It" must consist of its overview followed by one numbered list',
          },
        ],
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Run It\n\n1. Run it.",
        errors: [
          {
            message: 'guide section "How To Run It" must consist of its overview followed by one numbered list',
          },
        ],
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Run It\n\nFirst introduction.\n\nSecond introduction.\n\n1. Run it.",
        errors: [
          {
            message: 'guide section "How To Run It" must consist of its overview followed by one numbered list',
          },
        ],
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Run It\n\n1. Run it.\n\nMore detail.",
        errors: [
          {
            message: 'guide section "How To Run It" must consist of its overview followed by one numbered list',
          },
        ],
      },
    ],
  });
});
