import { describe, cssRuleTester } from "./rule-tester.js";
import { surfaceUtilityRule } from "./surface-utility.js";

void describe("A repeated combination of canvas, ink, and related styles MUST become a *-surface custom Tailwind utility that owns the combination.", () => {
  cssRuleTester.run("surface-utility", surfaceUtilityRule, {
    valid: [
      // The canvas+ink combination appears once
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}`,
      },
      // No canvas+ink combination at all
      {
        code: `@layer base {\n  body {\n    @apply bg-white;\n  }\n}`,
      },
    ],
    invalid: [
      // Same canvas+ink combination repeated across selectors
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n  html {\n    @apply bg-base-canvas text-base-ink;\n  }\n}`,
        errors: [
          {
            message:
              'Combination "bg-base-canvas text-base-ink" appears 2 times. Create a *-surface custom Tailwind utility for it.',
          },
        ],
      },
    ],
  });
});
