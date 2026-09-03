import { describe, documentationRuleTester } from "./rule-tester";
import { overviewRule } from "./overview";

void describe("A Guide overview MUST contain one or two short descriptive sentences about the guide's scope and purpose, and MUST NOT contain instructions or links to other documentation.", () => {
  documentationRuleTester.run("overview", overviewRule, {
    valid: [{ filename: "foo-guide.md", code: "# Foo Guide\n\nTwo short sentences. They are concise." }],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\nSee the [Other Guide](other-guide.md) for details.",
        errors: [{ message: "overview links another document" }],
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\nThree sentences are one too many. This is the second one. And this is the third.",
        errors: [{ message: "overview uses 3 sentences, at most two are allowed" }],
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## Section\n\nContent lives here.",
        errors: [{ message: "no overview follows the title" }],
      },
    ],
  });
});

void describe("The overview of each How To section MUST contain one or two short sentences explaining what the workflow accomplishes and when it should run, and MUST NOT contain instructions or links to other documentation.", () => {
  documentationRuleTester.run("overview", overviewRule, {
    valid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\nGuide overview.\n\n## How To Run It\n\nThis workflow verifies the project. Run it before committing.\n\n1. Run it.",
      },
    ],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\nGuide overview.\n\n## How To Run It\n\n1. Run it.",
        errors: [{ message: 'no overview follows guide section "How To Run It"' }],
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\nGuide overview.\n\n## How To Run It\n\nSee the [Run Guide](run-guide.md) first.\n\n1. Run it.",
        errors: [{ message: 'overview of guide section "How To Run It" links another document' }],
      },
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\nGuide overview.\n\n## How To Run It\n\nThis is one sentence. This is another. This is too many.\n\n1. Run it.",
        errors: [
          {
            message: 'overview of guide section "How To Run It" uses 3 sentences, at most two are allowed',
          },
        ],
      },
    ],
  });
});

void describe("A Rule overview MUST contain one or two short sentences naming the problem the rule solves, and MUST NOT contain instructions or links to other documentation.", () => {
  documentationRuleTester.run("overview", overviewRule, {
    valid: [{ filename: "foo-rule.md", code: "# Foo Rule\n\nTwo sentences here. They are short." }],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\nSee the [Policy](policy.md) for the requirement.",
        errors: [{ message: "overview links another document" }],
      },
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\nThree sentences here. The first is short. The second is short.",
        errors: [{ message: "overview uses 3 sentences, at most two are allowed" }],
      },
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\n## Section\n\nContent lives here.",
        errors: [{ message: "no overview follows the title" }],
      },
    ],
  });
});

void describe("A Policy overview MUST contain one or two short sentences naming the scope the requirements apply to, and MUST NOT contain instructions or links to other documentation.", () => {
  documentationRuleTester.run("overview", overviewRule, {
    valid: [
      { filename: "foo-policy.md", code: "# Foo Policy\n\nTwo sentences here. They are short." },
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\nOne sentence in the first paragraph.\n\nA second sentence in a later paragraph.",
      },
    ],
    invalid: [
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\nSee the [Guide](guide.md) for the workflow.",
        errors: [{ message: "overview links another document" }],
      },
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\nThree sentences here. The first is short. The second is short.",
        errors: [{ message: "overview uses 3 sentences, at most two are allowed" }],
      },
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\nTwo sentences in the first paragraph. They are short.\n\nA third sentence slipped into a second paragraph before the first heading.",
        errors: [{ message: "overview uses 3 sentences, at most two are allowed" }],
      },
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\n## Section\n\nContent lives here.",
        errors: [{ message: "no overview follows the title" }],
      },
    ],
  });
});

void describe("A Reference overview and the overview of each headed lookup block MUST contain one or two short sentences, and MUST NOT contain instructions or links to other documentation.", () => {
  documentationRuleTester.run("overview", overviewRule, {
    valid: [{ filename: "foo-reference.md", code: "# Foo Reference\n\nTwo sentences here. They are short." }],
    invalid: [
      {
        filename: "foo-reference.md",
        code: "# Foo Reference\n\nSee the [Rule](rule.md) for the constraint.",
        errors: [{ message: "overview links another document" }],
      },
      {
        filename: "foo-reference.md",
        code: "# Foo Reference\n\nThree sentences here. The first is short. The second is short.",
        errors: [{ message: "overview uses 3 sentences, at most two are allowed" }],
      },
      {
        filename: "foo-reference.md",
        code: "# Foo Reference\n\n## Section\n\nContent lives here.",
        errors: [{ message: "no overview follows the title" }],
      },
    ],
  });
});
