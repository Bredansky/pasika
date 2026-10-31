import { describe, tailwindRuleTester } from "./rule-tester";
import { utilityMappingRule } from "./utility-mapping";

void describe("When Tailwind supports a theme-generated utility for a CSS value, that utility MUST be used instead of an equivalent custom `@utility` or standalone CSS class; define the required `@theme` token if it does not yet exist.", () => {
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
              'Custom utility "text-retro-11" only maps font-size (11px); define a direct @theme token "--text-retro-11" with value "11px" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: ':root { --text-body: 14px; } [data-density="large"] { --text-body: 18px; } @utility text-body { @apply [font-size:var(--text-body)]; }',
        errors: [
          {
            message:
              'Custom utility "text-body" only maps font-size (var(--text-body)); only use a self-named @theme inline token "--text-body" with an unconditional :root default and a detected runtime override; otherwise resolve the fixed value directly in @theme. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility text-danger-canvas { @apply [color:#ff0000]; }",
        errors: [
          {
            message:
              'Custom utility "text-danger-canvas" only maps color (#ff0000); define a direct @theme token "--color-danger-ink" with value "#ff0000" rather than adding a :root bridge. Update class usages to "text-danger-ink" and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility text-tweet-card-name-size { @apply text-(length:--tweet-card-name-text-size); }`,
        errors: [
          {
            message:
              'Custom utility "text-tweet-card-name-size" only maps font-size (var(--tweet-card-name-text-size)); only use a self-named @theme inline token "--text-tweet-card-name-size" with an unconditional :root default and a detected runtime override; otherwise resolve the fixed value directly in @theme. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility tracking-retro-20 { @apply tracking-(--retro-letter-spacing); }`,
        errors: [
          {
            message:
              'Custom utility "tracking-retro-20" only maps letter-spacing (var(--retro-letter-spacing)); only use a self-named @theme inline token "--tracking-retro-20" with an unconditional :root default and a detected runtime override; otherwise resolve the fixed value directly in @theme. Preserve the generated class name and compare compiled CSS before removing the utility.',
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
      { code: "@utility border-style-outset { @apply [border-style:outset]; }" },
      {
        code: `@utility text-header-ink {\n  @apply text-(--header-ink);\n}`,
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
        code: `@utility content-grid {\n  @apply [grid-template-columns:2fr_max(0,var(--gutter-width))_calc(var(--gutter-width)+10px)];\n}`,
        errors: [{ message: /define an @theme token in the "--grid-template-columns-\*" namespace/u }],
      },
      {
        code: "@utility z-index-60 { @apply [z-index:60]; }",
        errors: [
          {
            message: 'Custom utility "z-index-60" duplicates built-in "z-60" (z-index: 60); use "z-60" directly.',
          },
        ],
      },
      {
        code: "@utility z-index-neg-1 { @apply [z-index:-1]; }",
        errors: [
          {
            message: 'Custom utility "z-index-neg-1" duplicates built-in "-z-1" (z-index: -1); use "-z-1" directly.',
          },
        ],
      },
      {
        code: "@utility z-index-auto { @apply [z-index:auto]; }",
        errors: [
          {
            message:
              'Custom utility "z-index-auto" duplicates built-in "z-auto" (z-index: auto); use "z-auto" directly.',
          },
        ],
      },
      {
        code: `@utility text-complex { @apply [font-size:calc(10px_+_2px)]; }`,
        errors: [{ message: /only maps font-size \(calc\(10px \+ 2px\)\); define a direct @theme token/u }],
      },
      {
        code: `@utility text-retro-11 { @apply [letter-spacing:0.11em]; }`,
        errors: [{ message: /define an @theme token in the "--tracking-\*" namespace/u }],
      },
      {
        code: `@utility tracking-minecraft-normal { @apply [letter-spacing:normal]; }`,
        errors: [
          {
            message:
              'Custom utility "tracking-minecraft-normal" only maps letter-spacing (normal); define a direct @theme token "--tracking-minecraft-normal" with value "normal" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
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
              'Custom utility "text-retro-11" only maps font-size (11px); define a direct @theme token "--text-retro-11" with value "11px" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility tracking-retro-30 { @apply [letter-spacing:0.3em]; }`,
        errors: [
          {
            message:
              'Custom utility "tracking-retro-30" only maps letter-spacing (0.3em); define a direct @theme token "--tracking-retro-30" with value "0.3em" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility tracking-tight-custom { @apply [letter-spacing:-0.025em]; }`,
        errors: [
          {
            message:
              'Custom utility "tracking-tight-custom" only maps letter-spacing (-0.025em); define a direct @theme token "--tracking-tight-custom" with value "-0.025em" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: `@utility text-retro-body { @apply [font-size:var(--retro-body-text-size)]; }`,
        errors: [
          {
            message:
              'Custom utility "text-retro-body" only maps font-size (var(--retro-body-text-size)); only use a self-named @theme inline token "--text-retro-body" with an unconditional :root default and a detected runtime override; otherwise resolve the fixed value directly in @theme. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
    ],
  });
});

void describe("utility-mapping: theme namespaces beyond typography", () => {
  tailwindRuleTester.run("utility-mapping:theme-namespaces", utilityMappingRule, {
    valid: [
      // Unhinted background variables are ambiguous: never guess color versus image.
      { code: "@utility bg-ambiguous { @apply bg-(--paint); }" },
      { code: "@utility filter-composite { @apply [filter:blur(8px)_contrast(1.2)]; }" },
      { code: "@utility filter-stacked { @apply [filter:drop-shadow(1px_1px_0_red)_drop-shadow(2px_2px_0_blue)]; }" },
      { code: "@utility box-shadow-mixed { @apply shadow-[inset_0_1px_red,0_2px_blue]; }" },
      { code: "@utility glitch-split { @apply [clip-path:inset(0_0_50%_0)]; }" },
      { code: "@utility mirrored { @apply [transform:scaleX(-1)]; }" },
      { code: "@utility border-shorthand { @apply [border:2px_ridge_red]; }" },
      { code: "@utility transition-shorthand { @apply [transition:width_0.8s_ease]; }" },
      {
        code: "@utility background-shorthand { @apply [background:repeating-linear-gradient(0deg,_transparent,_red_4px)]; }",
      },
      { code: "@utility background-asset { @apply [background:url(hero.png)_repeat]; }" },
      { code: "@utility shadow-mixed { @apply [box-shadow:inset_0_1px_#000,_0_2px_#fff]; }" },
      { code: "@utility filter-unknown { @apply [filter:made-up-effect(1)]; }" },
      { code: "@utility bg-photo { @apply [background-image:url(hero_file.png)]; }" },
      {
        code: "@theme { --radius-card: var(--border-radius); }\n@utility rounded-card { @apply [border-radius:12px]; }",
      },
    ],
    invalid: [
      {
        code: "@utility bg-image-linear-gradient-hash-83e0818e457c { @apply bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_30%)]; }",
        errors: [{ message: /define an @theme token in the "--background-image-\*" namespace/u }],
      },
      {
        code: "@utility bg-image-radial-gradient-hash-afd3062c0bf4 { @apply bg-[radial-gradient(circle_at_top,rgba(255,0,255,0.16),transparent_55%)]; }",
        errors: [{ message: /define an @theme token in the "--background-image-\*" namespace/u }],
      },
      {
        code: "@theme { --background-image-retro-canvas: linear-gradient(red, blue); }\n@utility bg-image-linear-gradient-hash-83e0818e457c { @apply bg-[linear-gradient(red,_blue)]; }",
        errors: [{ message: /duplicates theme-generated "bg-retro-canvas"/u }],
      },
      {
        code: "@utility box-shadow-hash-eab9c52f68c2 { @apply shadow-[inset_0_0_36px_rgba(0,0,0,0.55)]; }",
        errors: [{ message: /define an @theme token in the "--inset-shadow-\*" namespace/u }],
      },
      {
        code: "@utility box-shadow-hash-df43d74cde4b { @apply shadow-[0_18px_32px_rgba(0,0,0,0.45)]; }",
        errors: [{ message: /define an @theme token in the "--shadow-\*" namespace/u }],
      },
      {
        code: "@utility height-min-hash-721d316d8af5 { @apply h-[min(600px,80vw)]; }",
        errors: [{ message: /define an @theme token in the "--spacing-\*" namespace/u }],
      },
      {
        code: "@utility width-min-hash-721d316d8af5 { @apply w-[min(600px,80vw)]; }",
        errors: [{ message: /define an @theme token in the "--spacing-\*" namespace/u }],
      },
      {
        code: "@utility grid-template-columns-minmax-hash-88207f774793 { @apply grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]; }",
        errors: [{ message: /define an @theme token in the "--grid-template-columns-\*" namespace/u }],
      },
      {
        code: "@utility max-height-calc-hash-57227a565df2 { @apply [max-height:calc(100vh_-_200px)]; }",
        errors: [{ message: /define an @theme token in the "--spacing-\*" namespace/u }],
      },
      {
        code: '@utility font-family-hash-5845af77c70b { @apply [font-family:"minecraftiaregular",_"Code2000"]; }',
        errors: [{ message: /define an @theme token in the "--font-\*" namespace/u }],
      },
      {
        code: "@utility transition-property-hash-aeabbddf348b { @apply [transition-property:color,_border-color,_translate,_filter,_opacity]; }",
        errors: [{ message: /define an @theme token in the "--transition-property-\*" namespace/u }],
      },
      {
        code: "@utility filter-drop-shadow-hash-547e66e12c42 { @apply [filter:drop-shadow(0_0_2px_hsl(var(--magenta)))]; }",
        errors: [{ message: /define an @theme token in the "--drop-shadow-\*" namespace/u }],
      },
      {
        code: "@theme { --drop-shadow-chromatic: 0 0 2px hsl(var(--magenta)); }\n@utility filter-drop-shadow-hash-547e66e12c42 { @apply [filter:drop-shadow(0_0_2px_hsl(var(--magenta)))]; }",
        errors: [{ message: /duplicates theme-generated "drop-shadow-chromatic"/u }],
      },
      {
        code: "@utility blur-card { @apply [filter:blur(8px)]; }",
        errors: [{ message: /define a direct @theme token "--blur-card"/u }],
      },
      {
        code: "@utility filter-brightness-hash-cd9 { @apply [filter:brightness(1.3)]; }",
        errors: [{ message: /define an @theme token in the "--brightness-\*" namespace/u }],
      },
      {
        code: "@utility css-text-shadow-hash-d3 { @apply [text-shadow:2px_2px_0_#fff]; }",
        errors: [{ message: /define an @theme token in the "--text-shadow-\*" namespace/u }],
      },
      {
        code: "@utility backdrop-blur-card { @apply [backdrop-filter:blur(8px)]; }",
        errors: [{ message: /define a direct @theme token "--backdrop-blur-card"/u }],
      },
      {
        code: "@utility box-shadow-inset-hash-abc { @apply [box-shadow:inset_1px_1px_0_#000,_inset_-1px_-1px_0_#fff]; }",
        errors: [{ message: /define an @theme token in the "--inset-shadow-\*" namespace/u }],
      },
      {
        code: "@theme { --inset-shadow-mc-panel: inset 1px 1px 0 #000, inset -1px -1px 0 #fff; }\n@utility box-shadow-inset-hash-abc { @apply [box-shadow:inset_1px_1px_0_#000,_inset_-1px_-1px_0_#fff]; }",
        errors: [{ message: /duplicates theme-generated "inset-shadow-mc-panel"/u }],
      },
      {
        code: "@utility shadow-card { @apply [box-shadow:0_2px_4px_#000]; }",
        errors: [{ message: /define a direct @theme token "--shadow-card"/u }],
      },
      {
        code: "@theme { --shadow-retro-glow: 0 2px 4px #000; }\n@utility shadow-card { @apply [box-shadow:0_2px_4px_#000]; }",
        errors: [{ message: /duplicates theme-generated "shadow-retro-glow"/u }],
      },
      {
        code: "@utility box-shadow-hash-67bf68a3e9ad { @apply [box-shadow:0_0_8px_hsl(var(--primary)_/_0.4),_0_0_16px_hsl(var(--accent)_/_0.2),_0_0_32px_hsl(var(--primary)_/_0.1)]; }",
        errors: [{ message: /define an @theme token in the "--shadow-\*" namespace/u }],
      },
      {
        code: "@utility rounded-complex { @apply [border-radius:calc(8px_+_2px)]; }",
        errors: [{ message: /define a direct @theme token "--radius-complex"/u }],
      },
      {
        code: "@utility bg-special { @apply [background-color:color-mix(in_srgb,_red,_blue)]; }",
        errors: [{ message: /define a direct @theme token "--color-special-canvas"/u }],
      },
      {
        code: "@utility css-animation-wiggle-2s { @apply [animation:wiggle_2s_ease-in-out_infinite]; }",
        errors: [{ message: /define an @theme token in the "--animate-\*" namespace/u }],
      },
      {
        code: "@theme { --animate-wiggle: wiggle 2s ease-in-out infinite; }\n@utility css-animation-wiggle-2s { @apply [animation:wiggle_2s_ease-in-out_infinite]; }",
        errors: [{ message: /duplicates theme-generated "animate-wiggle"/u }],
      },
      {
        code: "@theme { --background-image-magic-canvas: linear-gradient(red, blue); }\n@utility bg-gradient-alias { @apply [background-image:linear-gradient(red,_blue)]; }",
        errors: [{ message: /duplicates theme-generated "bg-magic-canvas"/u }],
      },
      {
        code: "@utility css-font-size-var-body { @apply text-(length:--body); }",
        errors: [{ message: /define an @theme token in the "--text-\*" namespace/u }],
      },
      {
        code: "@utility css-background-image-var-art { @apply bg-(image:--art); }",
        errors: [{ message: /define an @theme token in the "--background-image-\*" namespace/u }],
      },
      {
        code: "@utility css-color-var-ink { @apply text-(color:--ink); }",
        errors: [{ message: /define an @theme token in the "--color-\*" namespace/u }],
      },
      {
        code: "@utility css-border-color-var-edge { @apply border-(color:--edge); }",
        errors: [{ message: /define an @theme token in the "--color-\*" namespace/u }],
      },
      {
        code: "@theme inline { --text-body: var(--body); }\n@utility css-font-size-var-body { @apply text-(length:--body); }",
        errors: [{ message: /duplicates theme-generated "text-body"/u }],
      },
      {
        code: "@utility css-font-size-14px { @apply [font-size:14px]; }",
        errors: [{ message: /define an @theme token in the "--text-\*" namespace/u }],
      },
      {
        code: "@utility css-background-color-hex-abc { @apply [background-color:#abc]; }",
        errors: [{ message: /define an @theme token in the "--color-\*" namespace/u }],
      },
      {
        code: "@theme { --color-surface-canvas: #abc; }\n@utility css-background-color-hex-abc { @apply [background-color:#abc]; }",
        errors: [{ message: /duplicates theme-generated "bg-surface-canvas"/u }],
      },
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
              'Custom utility "text-short" only maps font-size (14px); define a direct @theme token "--text-short" with value "14px" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility rounded-card { @apply [border-radius:12px]; }",
        errors: [
          {
            message:
              'Custom utility "rounded-card" only maps border-radius (12px); define a direct @theme token "--radius-card" with value "12px" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility bg-brand-canvas { @apply [background-color:#123456]; }",
        errors: [
          {
            message:
              'Custom utility "bg-brand-canvas" only maps background-color (#123456); define a direct @theme token "--color-brand-canvas" with value "#123456" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility p-card { @apply [padding:16px]; }",
        errors: [
          {
            message:
              'Custom utility "p-card" only maps padding (16px); define a direct @theme token "--spacing-card" with value "16px" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility leading-heading { @apply [line-height:1.4]; }",
        errors: [
          {
            message:
              'Custom utility "leading-heading" only maps line-height (1.4); define a direct @theme token "--leading-heading" with value "1.4" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility aspect-poster { @apply [aspect-ratio:16/9]; }",
        errors: [
          {
            message:
              'Custom utility "aspect-poster" only maps aspect-ratio (16/9); define a direct @theme token "--aspect-poster" with value "16/9" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
          },
        ],
      },
      {
        code: "@utility ease-panel { @apply [transition-timing-function:ease-in]; }",
        errors: [
          {
            message:
              'Custom utility "ease-panel" only maps transition-timing-function (ease-in); define a direct @theme token "--ease-panel" with value "ease-in" rather than adding a :root bridge. Preserve the generated class name and compare compiled CSS before removing the utility.',
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

void describe("When Tailwind supports a theme-generated utility for a CSS value, that utility MUST be used instead of an equivalent custom `@utility` or standalone CSS class; define the required `@theme` token if it does not yet exist.", () => {
  tailwindRuleTester.run("utility-mapping:prefer-theme-first", utilityMappingRule, {
    valid: [
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--other-gradient); }
@utility bg-rainbow-gradient-canvas { @apply [background-image:var(--rainbow-gradient)]; }`,
      },
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
.banner { background-image: var(--rainbow-gradient); background-size: 200% 100%; }`,
      },
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
@media (min-width: 50rem) { .banner { background-image: var(--rainbow-gradient); } }`,
      },
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
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
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
@utility bg-rainbow-gradient-canvas { @apply [background-image:var(--rainbow-gradient)]; }`,
        errors: [
          {
            message:
              'Custom utility "bg-rainbow-gradient-canvas" duplicates theme-generated "bg-rainbow-gradient-canvas" (background-image: var(--rainbow-gradient)); reuse "bg-rainbow-gradient-canvas" instead.',
          },
        ],
      },
      {
        code: `:root { --rainbow-gradient: linear-gradient(red, blue); --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
@theme inline { --background-image-rainbow-gradient-canvas: var(--background-image-rainbow-gradient-canvas); }
@utility bg-rainbow-gradient-canvas { @apply [background-image:var(--rainbow-gradient)]; }`,
        errors: [
          {
            message:
              'Custom utility "bg-rainbow-gradient-canvas" duplicates theme-generated "bg-rainbow-gradient-canvas" (background-image: var(--rainbow-gradient)); reuse "bg-rainbow-gradient-canvas" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
@utility bg-rainbow-gradient-canvas { background-image: var(--rainbow-gradient); }`,
        errors: [
          {
            message:
              'Custom utility "bg-rainbow-gradient-canvas" duplicates theme-generated "bg-rainbow-gradient-canvas" (background-image: var(--rainbow-gradient)); reuse "bg-rainbow-gradient-canvas" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
@utility fancy-gradient { @apply [background-image:var(--rainbow-gradient)]; }`,
        errors: [
          {
            message:
              'Custom utility "fancy-gradient" duplicates theme-generated "bg-rainbow-gradient-canvas" (background-image: var(--rainbow-gradient)); reuse "bg-rainbow-gradient-canvas" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
.custom-banner { @apply [background-image:var(--rainbow-gradient)]; }`,
        errors: [
          {
            message:
              'CSS class ".custom-banner" duplicates theme-generated "bg-rainbow-gradient-canvas" (background-image: var(--rainbow-gradient)); use "bg-rainbow-gradient-canvas" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
.custom-banner { @apply bg-rainbow-gradient-canvas; }`,
        errors: [
          {
            message:
              'CSS class ".custom-banner" only aliases theme-generated "bg-rainbow-gradient-canvas"; use "bg-rainbow-gradient-canvas" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
@layer components { .custom-banner { background-image: var(--rainbow-gradient); } }`,
        errors: [
          {
            message:
              'CSS class ".custom-banner" duplicates theme-generated "bg-rainbow-gradient-canvas" (background-image: var(--rainbow-gradient)); use "bg-rainbow-gradient-canvas" instead.',
          },
        ],
      },
      {
        code: `@theme { --background-image-rainbow-gradient-canvas: var(--rainbow-gradient); }
.custom-banner { background-image: var(--rainbow-gradient); }`,
        errors: [
          {
            message:
              'CSS class ".custom-banner" duplicates theme-generated "bg-rainbow-gradient-canvas" (background-image: var(--rainbow-gradient)); use "bg-rainbow-gradient-canvas" instead.',
          },
        ],
      },
    ],
  });
});
