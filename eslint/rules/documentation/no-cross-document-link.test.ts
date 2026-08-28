import { describe, documentationRuleTester } from "./rule-tester";
import { noCrossDocumentLinkRule } from "./no-cross-document-link";

void describe("A Policy document MUST NOT link to Rules, References, Guides, or other Policy documents.", () => {
  documentationRuleTester.run("no-cross-document-link", noCrossDocumentLinkRule, {
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

void describe("A Guide MAY link Rules, References, Policy documents, and other Guides.", () => {
  documentationRuleTester.run("no-cross-document-link", noCrossDocumentLinkRule, {
    valid: [
      // A guide may link a Rule, Reference, Policy, or another Guide.
      { filename: "foo-guide.md", code: "# Foo Guide\n\n1. Follow the [Rule](rule.md)." },
      { filename: "foo-guide.md", code: "# Foo Guide\n\n1. Read the [Reference](ref-reference.md)." },
      { filename: "foo-guide.md", code: "# Foo Guide\n\n1. Run the checks in [Policy](bar-policy.md)." },
      { filename: "foo-guide.md", code: "# Foo Guide\n\n1. See [How To Build](build-guide.md#how-to-build)." },
    ],
    invalid: [],
  });
});

void describe("A Reference MUST NOT link to Rules, Guides, Policy documents, or other References.", () => {
  documentationRuleTester.run("no-cross-document-link", noCrossDocumentLinkRule, {
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
  documentationRuleTester.run("no-cross-document-link", noCrossDocumentLinkRule, {
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
