import { describe, mdRuleTester } from "./rule-tester.js";
import { supportDocumentPlacementRule } from "./support-document-placement.js";

void describe("A Reference file that a Guide owns MUST live in a references/ subfolder inside the Guide's folder.", () => {
  mdRuleTester.run("support-document-placement", supportDocumentPlacementRule, {
    valid: [{ filename: "docs/foo-guide/references/glossary-reference.md", code: "# Glossary Reference" }],
    invalid: [
      {
        filename: "docs/foo-guide/glossary-reference.md",
        code: "# Glossary Reference",
        errors: [{ message: 'reference lives in "foo-guide/" instead of "references/"' }],
      },
    ],
  });
});

void describe("A Rule file that a Guide owns MUST live in a rules/ subfolder inside the Guide's folder.", () => {
  mdRuleTester.run("support-document-placement", supportDocumentPlacementRule, {
    valid: [{ filename: "docs/foo-guide/rules/bar-rule.md", code: "# Bar Rule" }],
    invalid: [
      {
        filename: "docs/foo-guide/bar-rule.md",
        code: "# Bar Rule",
        errors: [{ message: 'rule lives in "foo-guide/" instead of "rules/"' }],
      },
    ],
  });
});
