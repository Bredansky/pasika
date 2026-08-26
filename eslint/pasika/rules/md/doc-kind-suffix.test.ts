import { describe, mdRuleTester } from "./rule-tester.js";
import { docKindSuffixRule } from "./doc-kind-suffix.js";

void describe("Guide file names MUST match the document title in kebab-case and use the -guide suffix (e.g., foo-guide.md).", () => {
  mdRuleTester.run("doc-kind-suffix", docKindSuffixRule, {
    valid: [
      { filename: "foo-guide.md", code: "# Foo Guide" },
      { filename: "foo-rule.md", code: "# Foo Rule" },
      { filename: "foo-reference.md", code: "# Foo Reference" },
      { filename: "foo-policy.md", code: "# Foo Policy" },
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
