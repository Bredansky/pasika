import { describe, cssRuleTester } from "./rule-tester.js";
import { stylesheetOrderingRule } from "./stylesheet-ordering.js";

void describe("The global stylesheet MUST order imports, @custom-variant definitions, :root variables and the selectors that override them, @theme definitions, custom utilities, base styles, and keyframes in that order.", () => {
  cssRuleTester.run("stylesheet-ordering", stylesheetOrderingRule, {
    valid: [
      // Full stylesheet in the documented order
      {
        code: `@import "tailwindcss";\n\n@custom-variant dark (&:where(.dark, .dark *));\n\n:root {\n  --color-brand: #2563eb;\n}\n\n@theme {\n  --*: initial;\n}\n\n@utility card {\n  @apply rounded-xl bg-white;\n}\n\n@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}\n\n@keyframes fade {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}`,
      },
      // Partial stylesheet: only imports and :root
      {
        code: `@import "tailwindcss";\n\n:root {\n  --color-brand: #2563eb;\n}`,
      },
    ],
    invalid: [
      // @theme before :root
      {
        code: `@theme {\n  --*: initial;\n}\n\n:root {\n  --color-brand: #2563eb;\n}`,
        errors: [
          {
            message:
              'Global stylesheet sections must be ordered: imports, @custom-variant, :root, @theme, custom utilities, base styles, keyframes. Found "theme" before an earlier section.',
          },
        ],
      },
      // base styles before @theme
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas;\n  }\n}\n\n@theme {\n  --*: initial;\n}`,
        errors: [
          {
            message:
              'Global stylesheet sections must be ordered: imports, @custom-variant, :root, @theme, custom utilities, base styles, keyframes. Found "base styles" before an earlier section.',
          },
        ],
      },
    ],
  });
});
