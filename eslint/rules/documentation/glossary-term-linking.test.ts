import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, documentationRuleTester } from "./rule-tester";
import { glossaryTermLinkingRule } from "./glossary-term-linking";

/**
 * The rule reads the guide's `references/` folder from disk, so the fixture is a
 * real docs tree and every case lints a guide that lives inside it. Node runs
 * each test file in its own process, which keeps the temp root safe.
 */
const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-glossary-")));
const guideFile = path.join(root, "docs", "example-guide", "example-guide.md");

const GLOSSARY = [
  "# Glossary Reference",
  "",
  "Use this reference to look up the terms this guide's workflows use.",
  "",
  "| Term           | Definition                                     |",
  "| -------------- | ---------------------------------------------- |",
  "| Pipeline       | The calls a handler and its wrapper run.       |",
  "| `withResponse` | The wrapper a route handler is passed through. |",
  "| HttpError      | The error type a failed call throws.           |",
].join("\n");

/** A reference that is not a glossary, whose table must contribute no terms. */
const STACK = [
  "# Stack Reference",
  "",
  "Use this reference to look up the packages a repository declares.",
  "",
  "| Widget  | Responsibility                     |",
  "| ------- | ---------------------------------- |",
  "| Toolbar | A control strip the widgets sit in. |",
].join("\n");

const FIXTURE: Record<string, string> = {
  "docs/example-guide/example-guide.md": "# Example Guide\n",
  "docs/example-guide/references/glossary-reference.md": GLOSSARY,
  "docs/example-guide/references/stack-reference.md": STACK,
};

for (const [relativePath, content] of Object.entries(FIXTURE)) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

// The rule is also enforced over the real docs/ tree during self-lint; the cases
// below pin the fixture-side behavior.
void describe("A How To section whose steps use terms that a glossary Reference defines MUST link that Reference from the section's first step.", () => {
  documentationRuleTester.run("glossary-term-linking", glossaryTermLinkingRule, {
    valid: [
      {
        // A term from the glossary's table, with the section's first step linking it.
        filename: guideFile,
        code: [
          "# Example Guide",
          "",
          "## How To Wrap A Handler",
          "",
          "Use this when adding a route handler.",
          "",
          "1. Read the [Glossary Reference](references/glossary-reference.md) to learn the terms these workflows use.",
          "2. Throw an `HttpError` from the delegated module.",
        ].join("\n"),
      },
      {
        // A section whose steps use no defined term owes no glossary link.
        filename: guideFile,
        code: [
          "# Example Guide",
          "",
          "## How To Use The Stack",
          "",
          "Use this when picking a package.",
          "",
          "1. Follow the [Stack Rule](rules/stack-rule.md) for the widget list.",
          "2. Add the widget to the toolbar.",
        ].join("\n"),
      },
      {
        // A term in an earlier section does not oblige a later, term-free one.
        filename: guideFile,
        code: [
          "# Example Guide",
          "",
          "## How To Wrap A Handler",
          "",
          "Use this when adding a route handler.",
          "",
          "1. Read the [Glossary Reference](references/glossary-reference.md) to learn the terms these workflows use.",
          "2. Throw an `HttpError` from the delegated module.",
          "",
          "## How To Use The Stack",
          "",
          "Use this when picking a package.",
          "",
          "1. Follow the [Stack Rule](rules/stack-rule.md) for the widget list.",
          "2. Add the widget to the toolbar.",
        ].join("\n"),
      },
    ],
    invalid: [
      {
        // A backticked term named without its code span still counts.
        filename: guideFile,
        code: [
          "# Example Guide",
          "",
          "## How To Wrap A Handler",
          "",
          "Use this when adding a route handler.",
          "",
          "1. Follow the [Rule](rules/example-rule.md) for the wrapper shape.",
          "2. Wrap the handler in withResponse.",
        ].join("\n"),
        errors: [
          {
            message:
              'guide section "How To Wrap A Handler" uses glossary terms (`withResponse`) but its first step does not link the glossary reference',
          },
        ],
      },
      {
        // The later section is the one reported, even though the document's
        // first step already links the glossary.
        filename: guideFile,
        code: [
          "# Example Guide",
          "",
          "## How To Wrap A Handler",
          "",
          "Use this when adding a route handler.",
          "",
          "1. Read the [Glossary Reference](references/glossary-reference.md) to learn the terms these workflows use.",
          "2. Every pipeline ends at the wrapper.",
          "",
          "## How To Use The Stack",
          "",
          "Use this when picking a package.",
          "",
          "1. Follow the [Stack Rule](rules/stack-rule.md) for the widget list.",
          "2. Throw an `HttpError` when the widget is missing.",
        ].join("\n"),
        errors: [
          {
            message:
              'guide section "How To Use The Stack" uses glossary terms (HttpError) but its first step does not link the glossary reference',
          },
        ],
      },
    ],
  });
});
