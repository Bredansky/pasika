import { describe, documentationRuleTester } from "./rule-tester";
import { supportDocumentPlacementRule } from "./support-document-placement";

void describe("A Reference file MUST live in a references/ subfolder inside a *-guide folder that contains its matching Guide entry point.", () => {
  documentationRuleTester.run("support-document-placement", supportDocumentPlacementRule, {
    valid: [
      {
        filename: "docs/documentation-guide/references/documentation-types-reference.md",
        code: "# Documentation Types Reference",
      },
    ],
    invalid: [
      {
        filename: "docs/foo-guide/glossary-reference.md",
        code: "# Glossary Reference",
        errors: [{ message: 'reference lives in "foo-guide/" instead of "references/"' }],
      },
      {
        filename: "docs/references/glossary-reference.md",
        code: "# Glossary Reference",
        errors: [{ message: 'reference owner folder "docs/" does not use the "*-guide/" suffix' }],
      },
      {
        filename: "docs/missing-guide/references/glossary-reference.md",
        code: "# Glossary Reference",
        errors: [
          {
            message: 'reference owner folder "missing-guide/" has no "missing-guide.md" entry point',
          },
        ],
      },
    ],
  });
});

void describe("A Rule file MUST live in a rules/ subfolder inside a *-guide folder that contains its matching Guide entry point.", () => {
  documentationRuleTester.run("support-document-placement", supportDocumentPlacementRule, {
    valid: [
      {
        filename: "docs/documentation-guide/rules/guide-creation-rule.md",
        code: "# Guide Creation Rule",
      },
    ],
    invalid: [
      {
        filename: "docs/foo-guide/bar-rule.md",
        code: "# Bar Rule",
        errors: [{ message: 'rule lives in "foo-guide/" instead of "rules/"' }],
      },
      {
        filename: "docs/rules/bar-rule.md",
        code: "# Bar Rule",
        errors: [{ message: 'rule owner folder "docs/" does not use the "*-guide/" suffix' }],
      },
      {
        filename: "docs/missing-guide/rules/bar-rule.md",
        code: "# Bar Rule",
        errors: [{ message: 'rule owner folder "missing-guide/" has no "missing-guide.md" entry point' }],
      },
    ],
  });
});
