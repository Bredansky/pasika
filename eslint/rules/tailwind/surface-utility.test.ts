import { describe, tailwindRuleTester } from "./rule-tester";
import { surfaceUtilityRule } from "./surface-utility";

void describe("A repeated combination containing at least two of the canvas, ink, and edge roles plus any related styles MUST become a *-surface custom Tailwind utility that owns the combination.", () => {
  tailwindRuleTester.run("surface-utility", surfaceUtilityRule, {
    valid: [
      // The canvas+ink combination appears once
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}`,
      },
      // No canvas+ink combination at all
      {
        code: `@layer base {\n  body {\n    @apply bg-white;\n  }\n}`,
      },
      // Repeating two properties backed by the same edge role is an indicator, not a surface
      {
        code: `@layer base {\n  input {\n    @apply ring-subtle-edge outline-subtle-edge;\n  }\n  select {\n    @apply ring-subtle-edge outline-subtle-edge;\n  }\n}`,
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
      // Same canvas+edge combination repeated across selectors
      {
        code: `@layer base {\n  input {\n    @apply border-control-edge bg-control-canvas;\n  }\n  select {\n    @apply border-control-edge bg-control-canvas;\n  }\n}`,
        errors: [
          {
            message:
              'Combination "bg-control-canvas border-control-edge" appears 2 times. Create a *-surface custom Tailwind utility for it.',
          },
        ],
      },
    ],
  });
});
