import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, documentationRuleTester } from "./rule-tester";
import { guideLinkAnchorsRule } from "./guide-link-anchors";

void describe("A step that links another Guide MUST link directly to the relevant How To section.", () => {
  documentationRuleTester.run("guide-link-anchors", guideLinkAnchorsRule, {
    valid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [other guide](other-guide.md#how-to-do-it).",
      },
    ],
    invalid: [
      {
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [other guide](other-guide.md).",
        errors: [{ message: "guide link other-guide.md does not point to a specific section" }],
      },
      {
        // A guide reached through a folder is still a guide with no section.
        filename: "foo-guide.md",
        code: "# Foo Guide\n\n## How To Do It\n\n1. Read the [other guide](../other/other-guide.md).",
        errors: [{ message: "guide link ../other/other-guide.md does not point to a specific section" }],
      },
    ],
  });
});

/**
 * The anchor check reads the linked document from disk, so its cases lint a
 * guide that sits next to a real reference. Node runs each test file in its own
 * process, which keeps the temp root safe.
 */
const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-anchors-")));
const guideFile = path.join(root, "docs", "example-guide", "example-guide.md");

const REFERENCE = [
  "# Terms Reference",
  "",
  "Use this reference to look up the terms this guide uses.",
  "",
  "## Route Terms",
  "",
  "| Term     | Definition     |",
  "| -------- | -------------- |",
  "| Pipeline | The wrapper.   |",
].join("\n");

const FIXTURE: Record<string, string> = {
  "docs/example-guide/example-guide.md": "# Example Guide\n",
  "docs/example-guide/references/terms-reference.md": REFERENCE,
};

for (const [relativePath, content] of Object.entries(FIXTURE)) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

void describe("A link into a Markdown document MUST point at a heading that document contains.", () => {
  documentationRuleTester.run("guide-link-anchors", guideLinkAnchorsRule, {
    valid: [
      {
        // The anchor matches the heading the linked document renders.
        filename: guideFile,
        code: [
          "# Example Guide",
          "",
          "## How To Wrap A Handler",
          "",
          "Use this when adding a route handler.",
          "",
          "1. Read the [Route Terms](references/terms-reference.md#route-terms) so the wrapper has a name.",
        ].join("\n"),
      },
      {
        // A document that is not there is guide-mentions-documents' report.
        filename: guideFile,
        code: [
          "# Example Guide",
          "",
          "## How To Wrap A Handler",
          "",
          "Use this when adding a route handler.",
          "",
          "1. Read the [Route Terms](references/missing-reference.md#route-terms) so the wrapper has a name.",
        ].join("\n"),
      },
    ],
    invalid: [
      {
        // Off by one word: the document has `Route Terms`, not `Route Term`.
        filename: guideFile,
        code: [
          "# Example Guide",
          "",
          "## How To Wrap A Handler",
          "",
          "Use this when adding a route handler.",
          "",
          "1. Read the [Route Terms](references/terms-reference.md#route-term) so the wrapper has a name.",
        ].join("\n"),
        errors: [
          { message: "link references/terms-reference.md#route-term points at a heading the document does not have" },
        ],
      },
    ],
  });
});
