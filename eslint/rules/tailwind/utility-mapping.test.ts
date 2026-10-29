import { describe, tailwindRuleTester } from "./rule-tester";
import { utilityMappingRule } from "./utility-mapping";

void describe("When Tailwind can generate an equivalent class from an available `@theme` token, that class MUST take precedence over custom `@utility` definitions and standalone CSS class selectors; define a theme token instead of a redundant one-property utility when supported.", () => {
  tailwindRuleTester.run("utility-mapping", utilityMappingRule, {
    valid: [
      {
        code: `:root { --retro-11-text-size: 11px; }
@theme inline { --text-retro-11: var(--retro-11-text-size); }`,
      },
      {
        code: `:root { --retro-14-text-size: 14px; }
@theme { --text-sm: 0.875rem; --text-sm--line-height: 1.5; }
@theme inline { --text-retro-14: var(--retro-14-text-size); }`,
      },
    ],
    invalid: [
      {
        code: `@utility text-retro-11 { @apply [font-size:11px]; }`,
        errors: [
          {
            message:
              'Custom utility "text-retro-11" only maps font-size (11px); prefer @theme inline token "--text-retro-11" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility text-tweet-card-name-size { @apply text-(length:--tweet-card-name-text-size); }`,
        errors: [
          {
            message:
              'Custom utility "text-tweet-card-name-size" only maps font-size (var(--tweet-card-name-text-size)); prefer @theme inline token "--text-tweet-card-name-size" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility tracking-retro-20 { @apply tracking-(--retro-letter-spacing); }`,
        errors: [
          {
            message:
              'Custom utility "tracking-retro-20" only maps letter-spacing (var(--retro-letter-spacing)); prefer @theme inline token "--tracking-retro-20" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@theme { --text-sm: 14px; }
@theme inline { --text-retro-14: 14px; }`,
        errors: [
          {
            message:
              'Theme token "--text-retro-14" duplicates the configured built-in "--text-sm" (14px); reuse the "text-sm" utility instead of defining an equivalent theme token.',
          },
        ],
      },
    ],
  });
});

void describe("A custom utility MUST map exactly one Tailwind utility operation; reusable presentation MUST be expressed through a component rather than a utility that combines styles.", () => {
  tailwindRuleTester.run("utility-mapping", utilityMappingRule, {
    valid: [
      {
        code: `@utility text-header-ink {\n  @apply text-(--header-ink);\n}`,
      },
      {
        code: `@utility content-grid {\n  @apply [grid-template-columns:2fr_max(0,var(--gutter-width))_calc(var(--gutter-width)+10px)];\n}`,
      },
      // A pre-existing theme token must not receive a conflicting suggestion.
      {
        code: `@theme inline { --text-retro-11: var(--retro-text-size); }
@utility text-retro-11 { @apply [font-size:11px]; }`,
      },
      {
        code: `@theme inline { --color-retro-11: var(--retro-ink); }
@utility text-retro-11 { @apply [font-size:11px]; }`,
      },
      {
        code: `@utility text-retro-11 { @apply [letter-spacing:0.11em]; }`,
      },

      {
        code: `@utility text-complex { @apply [font-size:calc(10px_+_2px)]; }`,
      },
      {
        code: `@utility text-semantic { @apply [font-size:11px]; color: red; }`,
      },
      // The project's font-size-only pixel utility is not interchangeable
      // with a rem-based default or typography with paired properties.
      {
        code: `:root { --retro-14-text-size: 14px; }
@theme { --text-sm: 0.875rem; --text-sm--line-height: 1.5; --text-sm--letter-spacing: 0.015em; }
@theme inline { --text-retro-14: var(--retro-14-text-size); }`,
      },
      {
        code: `:root { --retro-16-text-size: 16px; }
@theme { --text-base: 1rem; --text-base--line-height: 1.5; }
@theme inline { --text-retro-16: var(--retro-16-text-size); }`,
      },
      {
        code: `@theme { --text-sm: 14px; --text-sm--line-height: 1.5; }
@theme inline { --text-retro-14: 14px; }`,
      },
      // If either class has a bundled typography operation, do not
      // recommend replacing it by a class with different CSS declarations.
      {
        code: `@theme { --text-sm: 14px; }
@theme inline { --text-retro-14: 14px; --text-retro-14--font-weight: 700; }`,
      },
      {
        code: `@theme { --text-sm: 14px; --text-sm--line-height: 1.5; }
@theme inline { --text-retro-14: 14px; --text-retro-14--line-height: 1.5; }`,
      },
      // A token that merely matches a *presumed* Tailwind default is not
      // considered redundant if the canonical token is not configured.
      {
        code: `@theme { --*: initial; }
@theme inline { --tracking-retro: 0em; }`,
      },
      // Dynamic/redefined roots cannot be resolved as one stable value.
      {
        code: `:root { --retro-tracking: 0em; }
@media (min-width: 50rem) { :root { --retro-tracking: 0.1em; } }
@theme { --tracking-normal: 0em; }
@theme inline { --tracking-retro: var(--retro-tracking); }`,
      },
      // A token with context-specific overrides is not a stable duplicate.
      {
        code: `:root { --retro-tracking: 0em; }
.dark { --retro-tracking: 0.2em; }
@theme { --tracking-normal: 0em; }
@theme inline { --tracking-retro: var(--retro-tracking); }`,
      },
      // Duplicate names are ambiguous even when their bodies look simple.
      {
        code: `@utility tracking-retro-30 { @apply [letter-spacing:0.3em]; }
@utility tracking-retro-30 { @apply [letter-spacing:0.3em]; }`,
      },
    ],
    invalid: [
      {
        code: `@utility tracking-minecraft-normal { @apply [letter-spacing:normal]; }`,
        errors: [
          {
            message:
              'Custom utility "tracking-minecraft-normal" only maps letter-spacing (normal); prefer @theme inline token "--tracking-minecraft-normal" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@theme { --text-sm: 14px; }
@theme inline { --text-retro-14: 14px; }`,
        errors: [
          {
            message:
              'Theme token "--text-retro-14" duplicates the configured built-in "--text-sm" (14px); reuse the "text-sm" utility instead of defining an equivalent theme token.',
          },
        ],
      },
      {
        code: `:root { --retro-tracking: 0.10em; }
@theme { --tracking-widest: 0.1em; }
@theme inline { --tracking-retro: var(--retro-tracking); }`,
        errors: [
          {
            message:
              'Theme token "--tracking-retro" duplicates the configured built-in "--tracking-widest" (0.1em); reuse the "tracking-widest" utility instead of defining an equivalent theme token.',
          },
        ],
      },
      {
        code: `@utility text-with-modifier { @apply [font-size:11px] !important; }`,
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
        errors: [
          {
            message:
              'Custom utility "text-retro-11" only maps font-size (11px); prefer @theme inline token "--text-retro-11" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility tracking-retro-30 { @apply [letter-spacing:0.3em]; }`,
        errors: [
          {
            message:
              'Custom utility "tracking-retro-30" only maps letter-spacing (0.3em); prefer @theme inline token "--tracking-retro-30" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility tracking-tight-custom { @apply [letter-spacing:-0.025em]; }`,
        errors: [
          {
            message:
              'Custom utility "tracking-tight-custom" only maps letter-spacing (-0.025em); prefer @theme inline token "--tracking-tight-custom" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility text-retro-body { @apply [font-size:var(--retro-body-text-size)]; }`,
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

void describe("utility-mapping: theme namespaces beyond typography", () => {
  tailwindRuleTester.run("utility-mapping:theme-namespaces", utilityMappingRule, {
    valid: [
      { code: "@utility shadow-card { @apply [box-shadow:0_2px_4px_#000]; }" },
      { code: "@utility blur-card { @apply [filter:blur(8px)]; }" },
      { code: "@utility rounded-complex { @apply [border-radius:calc(8px_+_2px)]; }" },
      { code: "@utility bg-special { @apply [background-color:color-mix(in_srgb,_red,_blue)]; }" },
      {
        code: "@theme { --radius-card: var(--border-radius); }\n@utility rounded-card { @apply [border-radius:12px]; }",
      },
    ],
    invalid: [
      {
        code: "@theme { --radius-card: 12px; }\n@utility rounded-card { @apply [border-radius:12px]; }",
        errors: [
          {
            message:
              'Custom utility "rounded-card" duplicates theme-generated "rounded-card" (border-radius: 12px); reuse "rounded-card" instead.',
          },
        ],
      },
      {
        code: "@theme { --text-sm: 14px; --text-sm--line-height: 1.5; }\n@utility text-short { @apply [font-size:14px]; }",
        errors: [
          {
            message:
              'Custom utility "text-short" only maps font-size (14px); prefer @theme inline token "--text-short" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility rounded-card { @apply [border-radius:12px]; }",
        errors: [
          {
            message:
              'Custom utility "rounded-card" only maps border-radius (12px); prefer @theme inline token "--radius-card" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility bg-brand-canvas { @apply [background-color:#123456]; }",
        errors: [
          {
            message:
              'Custom utility "bg-brand-canvas" only maps background-color (#123456); prefer @theme inline token "--color-brand-canvas" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility p-card { @apply [padding:16px]; }",
        errors: [
          {
            message:
              'Custom utility "p-card" only maps padding (16px); prefer @theme inline token "--spacing-card" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility leading-heading { @apply [line-height:1.4]; }",
        errors: [
          {
            message:
              'Custom utility "leading-heading" only maps line-height (1.4); prefer @theme inline token "--leading-heading" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility aspect-poster { @apply [aspect-ratio:16/9]; }",
        errors: [
          {
            message:
              'Custom utility "aspect-poster" only maps aspect-ratio (16/9); prefer @theme inline token "--aspect-poster" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility ease-panel { @apply [transition-timing-function:ease-in]; }",
        errors: [
          {
            message:
              'Custom utility "ease-panel" only maps transition-timing-function (ease-in); prefer @theme inline token "--ease-panel" backed by a :root variable. Preserve the class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@theme { --radius-tile: 12px; }\n@utility rounded-card { @apply [border-radius:12px]; }",
        errors: [
          {
            message:
              'Custom utility "rounded-card" duplicates theme-generated "rounded-tile" (border-radius: 12px); reuse "rounded-tile" instead.',
          },
        ],
      },
    ],
  });
});

void describe("When Tailwind can generate an equivalent class from an available `@theme` token, that class MUST take precedence over custom `@utility` definitions and standalone CSS class selectors; define a theme token instead of a redundant one-property utility when supported.", () => {
  tailwindRuleTester.run("utility-mapping:prefer-theme-first", utilityMappingRule, {
    valid: [
      {
        code: `@theme { --background-image-rainbow-gradient: var(--other-gradient); }
@utility bg-rainbow-gradient { @apply [background-image:var(--rainbow-gradient)]; }`,
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
.banner { background-image: var(--rainbow-gradient); background-size: 200% 100%; }`,
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
@media (min-width: 50rem) { .banner { background-image: var(--rainbow-gradient); } }`,
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
.banner:hover { background-image: var(--rainbow-gradient); }`,
      },
    ],
    invalid: [
      {
        code: `@theme { --color-primary-canvas: #aabbcc; }
@utility bg-accent-canvas { @apply [background-color:#abc]; }`,
        errors: [
          {
            message:
              'Custom utility "bg-accent-canvas" duplicates theme-generated "bg-primary-canvas" (background-color: #abc); reuse "bg-primary-canvas" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
@utility bg-rainbow-gradient { @apply [background-image:var(--rainbow-gradient)]; }`,
        errors: [
          {
            message:
              'Custom utility "bg-rainbow-gradient" duplicates theme-generated "bg-rainbow-gradient" (background-image: var(--rainbow-gradient)); reuse "bg-rainbow-gradient" instead.',
          },
        ],
      },
      {
        code: `:root { --rainbow-gradient: linear-gradient(red, blue); --background-image-rainbow-gradient: var(--rainbow-gradient); }
@theme inline { --background-image-rainbow-gradient: var(--background-image-rainbow-gradient); }
@utility bg-rainbow-gradient { @apply [background-image:var(--rainbow-gradient)]; }`,
        errors: [
          {
            message:
              'Custom utility "bg-rainbow-gradient" duplicates theme-generated "bg-rainbow-gradient" (background-image: var(--rainbow-gradient)); reuse "bg-rainbow-gradient" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
@utility bg-rainbow-gradient { background-image: var(--rainbow-gradient); }`,
        errors: [
          {
            message:
              'Custom utility "bg-rainbow-gradient" duplicates theme-generated "bg-rainbow-gradient" (background-image: var(--rainbow-gradient)); reuse "bg-rainbow-gradient" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
@utility fancy-gradient { @apply [background-image:var(--rainbow-gradient)]; }`,
        errors: [
          {
            message:
              'Custom utility "fancy-gradient" duplicates theme-generated "bg-rainbow-gradient" (background-image: var(--rainbow-gradient)); reuse "bg-rainbow-gradient" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
.custom-banner { @apply [background-image:var(--rainbow-gradient)]; }`,
        errors: [
          {
            message:
              'CSS class ".custom-banner" duplicates theme-generated "bg-rainbow-gradient" (background-image: var(--rainbow-gradient)); use "bg-rainbow-gradient" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
.custom-banner { @apply bg-rainbow-gradient; }`,
        errors: [
          {
            message:
              'CSS class ".custom-banner" only aliases theme-generated "bg-rainbow-gradient"; use "bg-rainbow-gradient" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
@layer components { .custom-banner { background-image: var(--rainbow-gradient); } }`,
        errors: [
          {
            message:
              'CSS class ".custom-banner" duplicates theme-generated "bg-rainbow-gradient" (background-image: var(--rainbow-gradient)); use "bg-rainbow-gradient" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient: var(--rainbow-gradient); }
.custom-banner { background-image: var(--rainbow-gradient); }`,
        errors: [
          {
            message:
              'CSS class ".custom-banner" duplicates theme-generated "bg-rainbow-gradient" (background-image: var(--rainbow-gradient)); use "bg-rainbow-gradient" instead.',
          },
        ],
      },
    ],
  });
});
