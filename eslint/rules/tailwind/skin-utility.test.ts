import { describe, tailwindRuleTester } from "./rule-tester";
import { skinUtilityRule } from "./skin-utility";

void describe("A custom utility that owns a combination of two or more styles MUST use the *-skin suffix.", () => {
  tailwindRuleTester.run("skin-utility", skinUtilityRule, {
    valid: [
      {
        code: `@utility invalid-skin {\n  @apply border-danger-edge ring-danger-subtle-edge;\n}`,
      },
      {
        code: `@utility text-link-ink {\n  @apply text-(--link-ink);\n}`,
      },
    ],
    invalid: [
      {
        code: `@utility invalid-indicator {\n  @apply border-danger-edge ring-danger-subtle-edge;\n}`,
        errors: [
          {
            message: 'Custom utility "invalid-indicator" combines 2 styles; use the *-skin suffix.',
          },
        ],
      },
    ],
  });
});

void describe("A repeated combination containing at least two semantic canvas, ink, or edge utilities plus any related styles MUST become a *-skin custom Tailwind utility that owns the combination.", () => {
  tailwindRuleTester.run("skin-utility", skinUtilityRule, {
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
              'Combination "bg-base-canvas text-base-ink" appears 2 times. Create a *-skin custom Tailwind utility for it.',
          },
        ],
      },
      // Same canvas+edge combination repeated across selectors
      {
        code: `@layer base {\n  input {\n    @apply border-control-edge bg-control-canvas;\n  }\n  select {\n    @apply border-control-edge bg-control-canvas;\n  }\n}`,
        errors: [
          {
            message:
              'Combination "bg-control-canvas border-control-edge" appears 2 times. Create a *-skin custom Tailwind utility for it.',
          },
        ],
      },
      // Same-role edge utilities still form a reusable skin
      {
        code: `@layer base {\n  input {\n    @apply ring-subtle-edge outline-subtle-edge;\n  }\n  select {\n    @apply ring-subtle-edge outline-subtle-edge;\n  }\n}`,
        errors: [
          {
            message:
              'Combination "outline-subtle-edge ring-subtle-edge" appears 2 times. Create a *-skin custom Tailwind utility for it.',
          },
        ],
      },
    ],
  });
});
