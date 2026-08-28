import { describe, documentationRuleTester } from "./rule-tester";
import { titleMatchesFileNameRule } from "./title-matches-file-name";

void describe("Policy file names MUST match the document title in kebab-case and use the -policy suffix (e.g., foo-policy.md).", () => {
  documentationRuleTester.run("title-matches-file-name", titleMatchesFileNameRule, {
    valid: [{ filename: "foo-policy.md", code: "# Foo Policy" }],
    invalid: [
      {
        filename: "bar-policy.md",
        code: "# Foo Policy",
        errors: [{ message: 'title "Foo Policy" expects file name foo-policy.md' }],
      },
    ],
  });
});

void describe("Reference file names MUST match the document title in kebab-case and use the -reference suffix (e.g., foo-reference.md).", () => {
  documentationRuleTester.run("title-matches-file-name", titleMatchesFileNameRule, {
    valid: [{ filename: "foo-reference.md", code: "# Foo Reference" }],
    invalid: [
      {
        filename: "bar-reference.md",
        code: "# Foo Reference",
        errors: [{ message: 'title "Foo Reference" expects file name foo-reference.md' }],
      },
    ],
  });
});

void describe("Rule file names MUST match the document title in kebab-case and use the -rule suffix (e.g., foo-rule.md).", () => {
  documentationRuleTester.run("title-matches-file-name", titleMatchesFileNameRule, {
    valid: [{ filename: "foo-rule.md", code: "# Foo Rule" }],
    invalid: [
      {
        filename: "bar-rule.md",
        code: "# Foo Rule",
        errors: [{ message: 'title "Foo Rule" expects file name foo-rule.md' }],
      },
    ],
  });
});
