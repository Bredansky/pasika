import { describe, tailwindRuleTester } from "./rule-tester";
import { skinUtilityRule } from "./skin-utility";

void describe("A combination of two or more styles that multiple consumers use together and should change together MUST become a <role>-skin custom utility.", () => {
  tailwindRuleTester.run("skin-utility", skinUtilityRule, {
    valid: [
      {
        code: `@utility invalid-skin {\n  @apply border-danger-edge ring-danger-subtle-edge;\n}`,
      },
      {
        code: `@utility text-link-ink {\n  @apply text-(--link-ink);\n}`,
      },
      // A combination with one consumer stays local.
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}`,
      },
      // One repeated style is not a combination.
      {
        code: `@layer base {\n  body {\n    @apply bg-white;\n  }\n  html {\n    @apply bg-white;\n  }\n}`,
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
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n  html {\n    @apply bg-base-canvas text-base-ink;\n  }\n}`,
        errors: [
          {
            message:
              'Combination "bg-base-canvas text-base-ink" appears 2 times. Create a *-skin custom Tailwind utility for it.',
          },
        ],
      },
      {
        code: `@layer base {\n  input {\n    @apply border-control-edge bg-control-canvas;\n  }\n  select {\n    @apply border-control-edge bg-control-canvas;\n  }\n}`,
        errors: [
          {
            message:
              'Combination "bg-control-canvas border-control-edge" appears 2 times. Create a *-skin custom Tailwind utility for it.',
          },
        ],
      },
      {
        code: `@layer base {\n  input {\n    @apply ring-subtle-edge outline-subtle-edge;\n  }\n  select {\n    @apply ring-subtle-edge outline-subtle-edge;\n  }\n}`,
        errors: [
          {
            message:
              'Combination "outline-subtle-edge ring-subtle-edge" appears 2 times. Create a *-skin custom Tailwind utility for it.',
          },
        ],
      },
      // Skins also own repeated combinations without semantic color roles.
      {
        code: `@layer base {\n  input {\n    @apply flex items-center;\n  }\n  select {\n    @apply flex items-center;\n  }\n}`,
        errors: [
          {
            message: 'Combination "flex items-center" appears 2 times. Create a *-skin custom Tailwind utility for it.',
          },
        ],
      },
    ],
  });
});
