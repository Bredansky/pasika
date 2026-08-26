import { describe, mdRuleTester } from "./rule-tester.js";
import { noCrossDocumentLinkRule } from "./no-cross-document-link.js";

void describe("A Policy document MUST NOT link to Rules, References, Guides, or other Policy documents.", () => {
  mdRuleTester.run("no-cross-document-link", noCrossDocumentLinkRule, {
    valid: [{ filename: "foo-policy.md", code: "# Foo Policy\n\n- Values MUST be kebab-case." }],
    invalid: [
      {
        filename: "foo-policy.md",
        code: "# Foo Policy\n\nSee the [Rule](rule.md).",
        errors: [{ message: "policy links another document: rule.md" }],
      },
    ],
  });
});

void describe("A Reference MUST NOT link to Rules, Guides, Policy documents, or other References.", () => {
  mdRuleTester.run("no-cross-document-link", noCrossDocumentLinkRule, {
    valid: [{ filename: "foo-reference.md", code: "# Foo Reference\n\nA term is defined here." }],
    invalid: [
      {
        filename: "foo-reference.md",
        code: "# Foo Reference\n\nSee the [Guide](foo-guide.md).",
        errors: [{ message: "reference links another document: foo-guide.md" }],
      },
    ],
  });
});

void describe("A Rule MUST NOT link to References, Guides, or other Rules.", () => {
  mdRuleTester.run("no-cross-document-link", noCrossDocumentLinkRule, {
    valid: [{ filename: "foo-rule.md", code: "# Foo Rule\n\n- Values MUST be kebab-case." }],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\nSee the [Reference](foo-reference.md).",
        errors: [{ message: "rule links another document: foo-reference.md" }],
      },
    ],
  });
});
