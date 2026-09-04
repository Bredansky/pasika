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
      // Reset alongside inline theme aliases in one block
      {
        code: `@theme inline {\n  --*: initial;\n  --color-brand: var(--brand);\n}`,
      },
      // Reset before the Tailwind v4 --animate-* pattern: nested @keyframes
      // inside the same @theme block (the tolerant parser wraps the block in a
      // Rule, so the reset must be found below the direct children)
      {
        code: `@theme {\n  --*: initial;\n  --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;\n\n  @keyframes pulse {\n    50% {\n      opacity: 0.5;\n    }\n  }\n}`,
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
