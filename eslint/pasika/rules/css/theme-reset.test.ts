import { describe, cssRuleTester } from "./rule-tester.js";
import { themeResetRule } from "./theme-reset.js";

void describe("The global stylesheet MUST reset Tailwind's default theme with --*: initial.", () => {
  cssRuleTester.run("theme-reset", themeResetRule, {
    valid: [
      // The reset inside an @theme block
      {
        code: `@theme {\n  --*: initial;\n}`,
      },
      // Reset alongside theme variables
      {
        code: `@theme {\n  --*: initial;\n  --color-brand: #2563eb;\n}`,
      },
    ],
    invalid: [
      // Theme block without the reset
      {
        code: `@theme {\n  --color-brand: #2563eb;\n}`,
        errors: [
          {
            message:
              "The global stylesheet must reset Tailwind's default theme with --*: initial inside an @theme block.",
          },
        ],
      },
      // No @theme block at all
      {
        code: `:root {\n  --color-brand: #2563eb;\n}`,
        errors: [
          {
            message:
              "The global stylesheet must reset Tailwind's default theme with --*: initial inside an @theme block.",
          },
        ],
      },
    ],
  });
});
