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
      // The POC is opt-in; existing projects keep the exact same diagnostics.
      {
        code: `@utility text-retro-11 { @apply [font-size:11px]; }`,
      },
      // A pre-existing theme token must not receive a conflicting suggestion.
      {
        code: `@theme inline { --text-retro-11: var(--retro-text-size); }
@utility text-retro-11 { @apply [font-size:11px]; }`,
        options: [{ preferThemeTokens: true }],
      },
      {
        code: `@theme inline { --color-retro-11: var(--retro-ink); }
@utility text-retro-11 { @apply [font-size:11px]; }`,
        options: [{ preferThemeTokens: true }],
      },
      {
        code: `@utility text-retro-11 { @apply [letter-spacing:0.11em]; }`,
        options: [{ preferThemeTokens: true }],
      },
      {
        code: `@utility tracking-minecraft-normal { @apply [letter-spacing:normal]; }`,
        options: [{ preferThemeTokens: true }],
      },
      {
        code: `@utility text-complex { @apply [font-size:calc(10px_+_2px)]; }`,
        options: [{ preferThemeTokens: true }],
      },
      {
        code: `@utility text-semantic { @apply [font-size:11px]; color: red; }`,
        options: [{ preferThemeTokens: true }],
      },
      // Duplicate names are ambiguous even when their bodies look simple.
      {
        code: `@utility tracking-retro-30 { @apply [letter-spacing:0.3em]; }
@utility tracking-retro-30 { @apply [letter-spacing:0.3em]; }`,
        options: [{ preferThemeTokens: true }],
      },
    ],
    invalid: [
      {
        code: `@utility text-with-modifier { @apply [font-size:11px] !important; }`,
        options: [{ preferThemeTokens: true }],
        errors: [
          {
            message:
              'Custom utility "text-with-modifier" maps 2 Tailwind operations; custom utilities must map exactly one operation. Reusable presentation belongs in a component.',
          },
        ],
      },
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
      {
        code: `@utility text-retro-11 { @apply [font-size:11px]; }`,
        options: [{ preferThemeTokens: true }],
        errors: [
          {
            message:
              'Custom utility "text-retro-11" only maps font-size (11px); prefer @theme inline token "--text-retro-11" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility tracking-retro-30 { @apply [letter-spacing:0.3em]; }`,
        options: [{ preferThemeTokens: true }],
        errors: [
          {
            message:
              'Custom utility "tracking-retro-30" only maps letter-spacing (0.3em); prefer @theme inline token "--tracking-retro-30" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility tracking-tight-custom { @apply [letter-spacing:-0.025em]; }`,
        options: [{ preferThemeTokens: true }],
        errors: [
          {
            message:
              'Custom utility "tracking-tight-custom" only maps letter-spacing (-0.025em); prefer @theme inline token "--tracking-tight-custom" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility text-retro-body { @apply [font-size:var(--retro-body-text-size)]; }`,
        options: [{ preferThemeTokens: true }],
        errors: [
          {
            message:
              'Custom utility "text-retro-body" only maps font-size (var(--retro-body-text-size)); prefer @theme inline token "--text-retro-body" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
    ],
  });
});
