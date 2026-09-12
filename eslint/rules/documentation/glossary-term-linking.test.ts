import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, documentationRuleTester } from "./rule-tester";
import { glossaryTermLinkingRule } from "./glossary-term-linking";

/**
 * The rule reads the guide's `references/` folder from disk, so the fixture is a
 * real docs tree and every case lints a guide that lives inside it. Two guides
 * cover the two shapes a glossary can have: one table, which needs no headings
 * and so owes no anchors, and one split into blocks, which owe one each. Node
 * runs each test file in its own process, which keeps the temp root safe.
 */
const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-glossary-")));
const singleTableGuide = path.join(root, "docs", "example-guide", "example-guide.md");
const blockedGuide = path.join(root, "docs", "blocked-guide", "blocked-guide.md");

/** One glossary covering every term the guide's workflows name. */
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
  "| Widget  | Responsibility                      |",
  "| ------- | ----------------------------------- |",
  "| Toolbar | A control strip the widgets sit in. |",
].join("\n");

/** A glossary split into two blocks, one per workflow that reads it. */
const BLOCKED_GLOSSARY = [
  "# Glossary Reference",
  "",
  "Use this reference to look up the terms this guide's workflows use.",
  "",
  "## Alpha Terms",
  "",
  "These terms name the first thing a workflow places.",
  "",
  "| Term  | Definition                        |",
  "| ----- | --------------------------------- |",
  "| Alpha | The first thing a workflow names. |",
  "",
  "## Beta Terms",
  "",
  "These terms name the second thing a workflow places.",
  "",
  "| Term | Definition                         |",
  "| ---- | ---------------------------------- |",
  "| Beta | The second thing a workflow names. |",
].join("\n");

const FIXTURE: Record<string, string> = {
  "docs/example-guide/example-guide.md": "# Example Guide\n",
  "docs/example-guide/references/glossary-reference.md": GLOSSARY,
  "docs/example-guide/references/stack-reference.md": STACK,
  "docs/blocked-guide/blocked-guide.md": "# Blocked Guide\n",
  "docs/blocked-guide/references/glossary-reference.md": BLOCKED_GLOSSARY,
};

for (const [relativePath, content] of Object.entries(FIXTURE)) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

/** A guide whose first step reads one block and whose second step names its term. */
const readsAlpha = [
  "# Blocked Guide",
  "",
  "## How To Place Alpha",
  "",
  "Use this when the first thing needs a home.",
  "",
  "1. Read the Alpha Terms in the [Glossary Reference](references/glossary-reference.md#alpha-terms) so the first thing has a name.",
  "2. Place the Alpha where its consumer sits.",
  "",
  "## How To Place Beta",
  "",
  "Use this when the second thing needs a home.",
  "",
  "1. Read the Beta Terms in the [Glossary Reference](references/glossary-reference.md#beta-terms) so the second thing has a name.",
  "2. Place the Beta where its consumer sits.",
].join("\n");

// The rule is also enforced over the real docs/ tree during self-lint; the cases
// below pin the fixture-side behavior.
void describe("A How To section whose steps use terms that a glossary Reference defines MUST link that Reference from the section's first step.", () => {
  documentationRuleTester.run("glossary-term-linking", glossaryTermLinkingRule, {
    valid: [
      {
        // A term from the glossary's table, with the section's first step linking it.
        filename: singleTableGuide,
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
        filename: singleTableGuide,
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
        filename: singleTableGuide,
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
        filename: singleTableGuide,
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
        filename: singleTableGuide,
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

void describe("Every lookup block of a glossary Reference MUST be anchored by the first step of a How To section.", () => {
  documentationRuleTester.run("glossary-term-linking", glossaryTermLinkingRule, {
    valid: [
      // Each block anchored by the section that reads it.
      { filename: blockedGuide, code: readsAlpha },
      {
        // A section whose steps are bullets rather than numbers anchors its
        // block just the same, so the shape of the list cannot dodge the check.
        filename: blockedGuide,
        code: [
          "# Blocked Guide",
          "",
          "## How To Place Alpha",
          "",
          "Use this when the first thing needs a home.",
          "",
          "- Read the Alpha Terms in the [Glossary Reference](references/glossary-reference.md#alpha-terms) so the first thing has a name.",
          "- Place the Alpha where its consumer sits.",
          "",
          "## How To Place Beta",
          "",
          "Use this when the second thing needs a home.",
          "",
          "- Read the Beta Terms in the [Glossary Reference](references/glossary-reference.md#beta-terms) so the second thing has a name.",
          "- Place the Beta where its consumer sits.",
        ].join("\n"),
      },
      {
        // A heading that is not a workflow ends the section before it, so the
        // step that anchors the block is still the section's own first one.
        filename: blockedGuide,
        code: [
          "# Blocked Guide",
          "",
          "## How To Place Alpha",
          "",
          "Use this when the first thing needs a home.",
          "",
          "1. Read the Alpha Terms in the [Glossary Reference](references/glossary-reference.md#alpha-terms) so the first thing has a name.",
          "",
          "## How To Place Beta",
          "",
          "Use this when the second thing needs a home.",
          "",
          "1. Read the Beta Terms in the [Glossary Reference](references/glossary-reference.md#beta-terms) so the second thing has a name.",
          "",
          "## Notes",
          "",
          "Use this section to explain a workflow end to end.",
        ].join("\n"),
      },
      {
        // A section may lead with something other than its overview; its steps
        // are then every paragraph it has, the linking one among them.
        filename: blockedGuide,
        code: [
          "# Blocked Guide",
          "",
          "## How To Place Alpha",
          "",
          "```text",
          "folder/",
          "```",
          "",
          "Read the Alpha Terms in the [Glossary Reference](references/glossary-reference.md#alpha-terms) so the first thing has a name.",
          "",
          "## How To Place Beta",
          "",
          "```text",
          "folder/",
          "```",
          "",
          "Read the Beta Terms in the [Glossary Reference](references/glossary-reference.md#beta-terms) so the second thing has a name.",
        ].join("\n"),
      },
      {
        // A section that writes its steps as prose after the overview still
        // owes each block an anchor from the first of them.
        filename: blockedGuide,
        code: [
          "# Blocked Guide",
          "",
          "## How To Place Alpha",
          "",
          "Use this when the first thing needs a home.",
          "",
          "Read the Alpha Terms in the [Glossary Reference](references/glossary-reference.md#alpha-terms) so the first thing has a name.",
          "",
          "Place the Alpha where its consumer sits.",
          "",
          "## How To Place Beta",
          "",
          "Use this when the second thing needs a home.",
          "",
          "Read the Beta Terms in the [Glossary Reference](references/glossary-reference.md#beta-terms) so the second thing has a name.",
          "",
          "Place the Beta where its consumer sits.",
        ].join("\n"),
      },
      {
        // A glossary kept as one table has no block to anchor.
        filename: singleTableGuide,
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
    ],
    invalid: [
      {
        // The alpha workflow reads its block; the beta block has no reader, so
        // the split is a taxonomy rather than a workflow.
        filename: blockedGuide,
        code: [
          "# Blocked Guide",
          "",
          "## How To Place Alpha",
          "",
          "Use this when the first thing needs a home.",
          "",
          "1. Read the Alpha Terms in the [Glossary Reference](references/glossary-reference.md#alpha-terms) so the first thing has a name.",
          "2. Place the Alpha where its consumer sits.",
        ].join("\n"),
        errors: [{ message: 'glossary block "Beta Terms" is anchored by no How To section\'s first step' }],
      },
      {
        // Anchored, but from a later step of a bulleted list, so the list's
        // shape does not move the block out from under the check.
        filename: blockedGuide,
        code: [
          "# Blocked Guide",
          "",
          "## How To Place Alpha",
          "",
          "Use this when the first thing needs a home.",
          "",
          "- Pick the folder per the [Glossary Reference](references/glossary-reference.md).",
          "- Read the [Alpha Terms](references/glossary-reference.md#alpha-terms) so the first thing has a name.",
        ].join("\n"),
        errors: [
          { message: 'glossary block "Alpha Terms" is anchored by no How To section\'s first step' },
          { message: 'glossary block "Beta Terms" is anchored by no How To section\'s first step' },
        ],
      },
      {
        // Anchored, but from a later step, so the reader meets the terms after
        // the decision the block is meant to define.
        filename: blockedGuide,
        code: [
          "# Blocked Guide",
          "",
          "## How To Place Alpha",
          "",
          "Use this when the first thing needs a home.",
          "",
          "1. Pick the folder per the [Glossary Reference](references/glossary-reference.md).",
          "2. Read the [Alpha Terms](references/glossary-reference.md#alpha-terms) so the first thing has a name.",
          "3. Place the Alpha where its consumer sits.",
        ].join("\n"),
        errors: [
          { message: 'glossary block "Alpha Terms" is anchored by no How To section\'s first step' },
          { message: 'glossary block "Beta Terms" is anchored by no How To section\'s first step' },
        ],
      },
    ],
  });
});
