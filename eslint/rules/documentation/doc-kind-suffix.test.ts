import { describe, documentationRuleTester } from "./rule-tester";
import { docKindSuffixRule } from "./doc-kind-suffix";

void describe("Guide file names MUST match the document title in kebab-case and use the -guide suffix (e.g., foo-guide.md).", () => {
  documentationRuleTester.run("doc-kind-suffix", docKindSuffixRule, {
    valid: [
      { filename: "foo-guide.md", code: "# Foo Guide" },
      { filename: "foo-rule.md", code: "# Foo Rule" },
      { filename: "foo-reference.md", code: "# Foo Reference" },
      { filename: "foo-policy.md", code: "# Foo Policy" },
      { filename: "docs/AGENTS.md", code: "# Documentation Guide" },
      { filename: "docs/CLAUDE.md", code: "# Documentation Guide" },
      { filename: "docs/documentation-guide/_templates/guide.md", code: "# [Topic] Guide" },
    ],
    invalid: [
      {
        filename: "foo.md",
        code: "# Foo",
        errors: [{ message: "file name carries no -guide, -rule, -reference, or -policy suffix" }],
      },
    ],
  });
});
