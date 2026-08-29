import { describe, tailwindRuleTester } from "./rule-tester";
import { themeResetRule } from "./theme-reset";

void describe("The global stylesheet MUST reset Tailwind's default theme with --*: initial.", () => {
  tailwindRuleTester.run("theme-reset", themeResetRule, {
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
