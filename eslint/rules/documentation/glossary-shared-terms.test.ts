import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { glossarySharedTermsRule } from "./glossary-shared-terms";
import { describe, documentationRuleTester } from "./rule-tester";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-glossary-shared-")));
const file = (relative: string): string => path.join(root, "docs", relative);
const write = (relative: string, content: string): void => {
  const filename = file(relative);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, content);
};

function table(term: string): string {
  return [
    "# Glossary Reference",
    "",
    "This reference defines a term shared across workflows.",
    "",
    "| Term | Definition |",
    "| --- | --- |",
    `| ${term} | A reusable concept. |`,
  ].join("\n");
}

write("shared-guide/references/glossary-reference.md", table("Shared state"));
write("shared-guide/shared-guide.md", "# Shared Guide\n\nThe shared state drives rendering.\n");
write("shared-guide/rules/state-rule.md", "# State Rule\n\nShared states persist across actions.\n");

write("abbreviation-guide/references/glossary-reference.md", table("Closest common folder (CCF)"));
write("abbreviation-guide/abbreviation-guide.md", "# Abbreviation Guide\n\nPlace it at the CCF.\n");
write("abbreviation-guide/rules/ccf-rule.md", "# CCF Rule\n\nThe CCF is where consumers converge.\n");

write("single-guide/references/glossary-reference.md", table("Rare hook"));
write("single-guide/single-guide.md", "# Single Guide\n\nA rare hook is special. This rare hook appears again.\n");
write(
  "single-guide/rules/fenced-rule.md",
  [
    "# Fenced Rule",
    "",
    "Example only:",
    "",
    `${String.fromCharCode(96).repeat(3)}ts`,
    "// rare hook",
    String.fromCharCode(96).repeat(3),
    "",
    "[Example](rare-hook.md)",
  ].join("\n"),
);

write("unused-guide/references/glossary-reference.md", table("Unused concept"));
write("unused-guide/unused-guide.md", "# Unused Guide\n\nNo relevant words here.\n");

write("other-guide/references/glossary-reference.md", table("Outside keyword"));
write("other-guide/other-guide.md", "# Other Guide\n\nOutside keyword lives here only.\n");
write("foreign-guide/foreign-guide.md", "# Foreign Guide\n\nOutside keyword lives here too.\n");

write("bounded-guide/references/glossary-reference.md", table("Ink"));
write("bounded-guide/bounded-guide.md", "# Bounded Guide\n\nThis ink is used here.\n");
write("bounded-guide/rules/links-rule.md", "# Links Rule\n\nLink and thinking are not color roles.\n");

write(
  "headings-guide/references/glossary-reference.md",
  "# Glossary Reference\n\nTerms appear as headings.\n\n## Runtime boundary\n\nA boundary.\n",
);
write("headings-guide/headings-guide.md", "# Headings Guide\n\nRuntime boundary is a concept.\n");
write("headings-guide/rules/boundary-rule.md", "# Boundary Rule\n\nRuntime boundaries can be nested.\n");

write("plural-guide/references/glossary-reference.md", table("Box"));
write("plural-guide/plural-guide.md", "Box");
write("plural-guide/rules/boxes-rule.md", "# Boxes Rule\n\nBoxes are shared containers.");

write("prefix-guide/references/glossary-reference.md", table("Box"));
write("prefix-guide/prefix-guide.md", "# Prefix Guide\n\nA box is stored here.");
write("prefix-guide/rules/boxing-rule.md", "# Boxing Rule\n\nBoxing does not reuse the term.");

process.chdir(root);

void describe("A Glossary Reference MUST NOT define a term appearing in fewer than two other documentation files belonging to the same guide.", () => {
  documentationRuleTester.run("glossary-shared-terms", glossarySharedTermsRule, {
    valid: [
      { filename: file("shared-guide/references/glossary-reference.md"), code: table("Shared state") },
      {
        filename: file("abbreviation-guide/references/glossary-reference.md"),
        code: table("Closest common folder (CCF)"),
      },
      {
        filename: file("headings-guide/references/glossary-reference.md"),
        code: "# Glossary Reference\n\nTerms appear as headings.\n\n## Runtime boundary\n\nA boundary.\n",
      },
      { filename: file("single-guide/references/stack-reference.md"), code: table("Rare hook") },
      { filename: file("plural-guide/references/glossary-reference.md"), code: table("Box") },
    ],
    invalid: [
      {
        filename: file("single-guide/references/glossary-reference.md"),
        code: table("Rare hook"),
        errors: [{ message: /glossary term "Rare hook" appears in 1 other documentation file/u }],
      },
      {
        filename: file("unused-guide/references/glossary-reference.md"),
        code: table("Unused concept"),
        errors: [{ message: /glossary term "Unused concept" appears in 0 other documentation file/u }],
      },
      {
        filename: file("other-guide/references/glossary-reference.md"),
        code: table("Outside keyword"),
        errors: [{ message: /glossary term "Outside keyword" appears in 1 other documentation file/u }],
      },
      {
        filename: file("bounded-guide/references/glossary-reference.md"),
        code: table("Ink"),
        errors: [{ message: /glossary term "Ink" appears in 1 other documentation file/u }],
      },
      {
        filename: file("prefix-guide/references/glossary-reference.md"),
        code: table("Box"),
        errors: [{ message: /glossary term "Box" appears in 1 other documentation file/u }],
      },
    ],
  });
});
