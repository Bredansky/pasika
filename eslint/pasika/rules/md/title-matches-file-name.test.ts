import { describe, mdRuleTester } from "./rule-tester.js";
import { titleMatchesFileNameRule } from "./title-matches-file-name.js";

void describe("Policy file names MUST match the document title in kebab-case and use the -policy suffix (e.g., foo-policy.md).", () => {
  mdRuleTester.run("title-matches-file-name", titleMatchesFileNameRule, {
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
  mdRuleTester.run("title-matches-file-name", titleMatchesFileNameRule, {
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
  mdRuleTester.run("title-matches-file-name", titleMatchesFileNameRule, {
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
