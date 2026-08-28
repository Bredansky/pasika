import { describe, mdRuleTester } from "./rule-tester";
import { rfcOnlyInBulletsRule } from "./rfc-only-in-bullets";

void describe("RFC 2119 vocabulary MUST appear only in bullet points, so the bullet list is the single place a requirement is stated.", () => {
  mdRuleTester.run("rfc-only-in-bullets", rfcOnlyInBulletsRule, {
    valid: [
      // RFC vocabulary only in bullets, prose restates in plain language
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\nValues stay kebab-case.\n\n- Values MUST be kebab-case.\n\n## Correct — Good Name\n\n```\nGood\n```",
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\nValues MUST be kebab-case.\n\n- Values SHOULD be short.",
        errors: [{ message: 'RFC 2119 vocabulary "MUST" appears outside a bullet point' }],
      },
    ],
  });
});

void describe("Prose outside bullet points — intros, Why: explanations, table cells, and code comments — MUST restate a requirement in plain language instead of repeating RFC 2119 vocabulary.", () => {
  mdRuleTester.run("rfc-only-in-bullets", rfcOnlyInBulletsRule, {
    valid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\nWhy: values stay short.\n\n- Values MUST be kebab-case.",
      },
    ],
    invalid: [
      {
        filename: "foo-rule.md",
        code: "# Foo Rule\n\nWhy: values MUST stay short.\n\n- Values SHOULD be kebab-case.",
        errors: [{ message: 'RFC 2119 vocabulary "MUST" appears outside a bullet point' }],
      },
    ],
  });
});
