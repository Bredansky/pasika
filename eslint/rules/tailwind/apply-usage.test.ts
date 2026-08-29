import { describe, tailwindRuleTester } from "./rule-tester";
import { applyUsageRule } from "./apply-usage";

void describe("Style declarations added by the project inside global selectors MUST use @apply.", () => {
  tailwindRuleTester.run("apply-usage", applyUsageRule, {
    valid: [
      // Base layer declarations go through @apply
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}`,
      },
      // No base layer at all
      {
        code: `@theme {\n  --*: initial;\n}`,
      },
    ],
    invalid: [
      // Raw CSS property in a base layer rule
      {
        code: `@layer base {\n  body {\n    background-color: #ffffff;\n  }\n}`,
        errors: [{ message: 'Style declaration "background-color" inside a global selector must use @apply.' }],
      },
      // Multiple raw declarations each reported
      {
        code: `@layer base {\n  body {\n    color: #111827;\n    background-color: #ffffff;\n  }\n}`,
        errors: [
          { message: 'Style declaration "color" inside a global selector must use @apply.' },
          { message: 'Style declaration "background-color" inside a global selector must use @apply.' },
        ],
      },
    ],
  });
});
