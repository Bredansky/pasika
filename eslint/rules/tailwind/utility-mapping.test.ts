import { describe, tailwindRuleTester } from "./rule-tester";
import { utilityMappingRule } from "./utility-mapping";

void describe("A custom utility MUST map exactly one Tailwind utility operation; reusable presentation MUST be expressed through a component rather than a utility that combines styles.", () => {
  tailwindRuleTester.run("utility-mapping", utilityMappingRule, {
    valid: [
      {
        code: `@utility text-header-ink {\n  @apply text-(--header-ink);\n}`,
      },
      {
        code: `@utility content-grid {\n  @apply [grid-template-columns:2fr_max(0,var(--gutter-width))_calc(var(--gutter-width)+10px)];\n}`,
      },
    ],
    invalid: [
      {
        code: `@utility primary-action {\n  @apply bg-primary-canvas text-primary-ink;\n}`,
        errors: [
          {
            message:
              'Custom utility "primary-action" maps 2 Tailwind operations; custom utilities must map exactly one operation. Reusable presentation belongs in a component.',
          },
        ],
      },
      {
        code: `@utility focus-treatment {\n  @apply border-emphasis-edge;\n  @apply ring-3;\n}`,
        errors: [
          {
            message:
              'Custom utility "focus-treatment" maps 2 Tailwind operations; custom utilities must map exactly one operation. Reusable presentation belongs in a component.',
          },
        ],
      },
      {
        code: `@utility empty-mapping {}\n`,
        errors: [
          {
            message:
              'Custom utility "empty-mapping" maps 0 Tailwind operations; custom utilities must map exactly one operation. Reusable presentation belongs in a component.',
          },
        ],
      },
    ],
  });
});
