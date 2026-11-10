import { colorRoleUsageRule } from "./color-role-usage";
import { describe, tailwindRuleTester } from "./rule-tester";

const backgroundImageNaming = (token: string): string =>
  `Background-image token "${token}" needs a semantic role ending in -canvas.`;
const mismatch = (className: string, role: string, purpose: string, expected: string): string =>
  `Color utility "${className}" uses a "${role}" token for ${purpose}; use a "${expected}" token instead.`;

void describe("Tailwind color tokens with semantic suffixes (`-canvas`, `-ink`, `-edge`) MUST match their utility roles: canvas for backgrounds, background images, fills, gradients, and ring offsets; ink for text, carets, and text decoration; edge for borders, outlines, focus rings, dividers, and SVG strokes. Color tokens shared across roles MUST omit the semantic suffix.", () => {
  tailwindRuleTester.run("color-role-usage-background-image-tokens", colorRoleUsageRule, {
    valid: [
      {
        code: "@theme { --background-image-rainbow-gradient-canvas: linear-gradient(90deg, red, blue); }",
      },
      {
        code: "@theme inline { --background-image-hero-canvas: var(--hero-image); }",
      },
      {
        code: "@theme { /* --background-image-hidden: url('/old.png'); */ --background-image-card-canvas: url('/card.png'); }",
      },
      {
        code: "@theme { --color-base-canvas: #000; --animate-pulse: pulse 2s infinite; }",
      },
    ],
    invalid: [
      {
        code: "@theme { --background-image-rainbow-gradient: linear-gradient(90deg, red, blue); }",
        errors: [{ message: backgroundImageNaming("--background-image-rainbow-gradient") }],
      },
      {
        code: "@theme inline { --background-image-hero: var(--hero-image); }",
        errors: [{ message: backgroundImageNaming("--background-image-hero") }],
      },
      {
        code: "@theme { --background-image-rainbow-gradient-ink: linear-gradient(red, blue); }",
        errors: [{ message: backgroundImageNaming("--background-image-rainbow-gradient-ink") }],
      },
    ],
  });

  tailwindRuleTester.run("color-role-usage-naming", colorRoleUsageRule, {
    valid: [
      { code: "@theme { --*: initial; --color-base-canvas: #fff; --color-base-ink: #111; --color-base-edge: #ccc; }" },
      { code: "@theme inline { --color-primary-canvas: var(--primary); }" },
      { code: "@theme { --color-brand: #2563eb; }" },
      { code: "@theme { --color-button: #123456; --color-border: #ccc; }" },
      { code: "@theme { --radius-md: 4px; --text-card-title: 1rem; }" },
    ],
    invalid: [],
  });

  tailwindRuleTester.run("color-role-usage-apply", colorRoleUsageRule, {
    valid: [
      {
        code: "@apply bg-shiny-canvas text-shiny-ink border-shiny-edge outline-shiny-edge ring-shiny-edge stroke-shiny-edge;",
      },
      {
        code: "@apply hover:bg-shiny-canvas/50 divide-shiny-edge ring-offset-shiny-canvas from-shiny-canvas to-shiny-canvas;",
      },
      { code: "@apply p-4 border-2 text-lg bg-[color:var(--runtime)] bg-(--runtime);" },
      { code: "@apply bg-brand text-brand border-brand hover:ring-brand;" },
    ],
    invalid: [
      {
        code: "@apply bg-shiny-ink;",
        errors: [{ message: mismatch("bg-shiny-ink", "ink", "backgrounds, fills, or gradients", "canvas") }],
      },
      {
        code: "@apply hover:bg-shiny-ink/50;",
        errors: [{ message: mismatch("hover:bg-shiny-ink/50", "ink", "backgrounds, fills, or gradients", "canvas") }],
      },
      {
        code: "@apply text-shiny-canvas;",
        errors: [{ message: mismatch("text-shiny-canvas", "canvas", "text, carets, or text decoration", "ink") }],
      },
      {
        code: "@apply border-shiny-ink outline-shiny-canvas;",
        errors: [
          { message: mismatch("border-shiny-ink", "ink", "borders, outlines, rings, dividers, or strokes", "edge") },
          {
            message: mismatch(
              "outline-shiny-canvas",
              "canvas",
              "borders, outlines, rings, dividers, or strokes",
              "edge",
            ),
          },
        ],
      },
      {
        code: "@apply ring-shiny-ink stroke-shiny-canvas;",
        errors: [
          { message: mismatch("ring-shiny-ink", "ink", "borders, outlines, rings, dividers, or strokes", "edge") },
          {
            message: mismatch(
              "stroke-shiny-canvas",
              "canvas",
              "borders, outlines, rings, dividers, or strokes",
              "edge",
            ),
          },
        ],
      },
    ],
  });

  const misplacedToken = (token: string, role: string): string =>
    `Color token "${token}" places semantic role "-${role}" before the end of its name; move the role to the end or omit it for shared colors.`;
  const misplacedClass = (className: string, role: string): string =>
    `Color utility "${className}" places semantic role "-${role}" before the end of its name; move the role to the end or omit it for shared colors.`;

  tailwindRuleTester.run("color-role-usage-nonterminal-token", colorRoleUsageRule, {
    valid: [
      {
        code: "@theme inline { --color-brand: #123456; --color-brand-500: #234567; --color-brand-canvas: #345678; --color-brand-ink: #456789; --color-brand-edge: #56789a; }",
      },
      { code: "@theme inline { /* --color-bad-canvas-2: #000; */ --color-good-canvas: #fff; }" },
    ],
    invalid: [
      {
        code: "@theme inline { --color-donation-background-image-mc-boss-gradient-canvas-2: #ff00ff; }",
        errors: [
          {
            message: misplacedToken("--color-donation-background-image-mc-boss-gradient-canvas-2", "canvas"),
          },
        ],
      },
      {
        code: "@theme inline { --color-notice-ink-1: #123456; }",
        errors: [{ message: misplacedToken("--color-notice-ink-1", "ink") }],
      },
      {
        code: "@theme inline { --color-frame-edge-border-color: #123456; }",
        errors: [{ message: misplacedToken("--color-frame-edge-border-color", "edge") }],
      },
      {
        code: "@theme inline { --color-palette-canvas-ink: #123456; }",
        errors: [{ message: misplacedToken("--color-palette-canvas-ink", "canvas") }],
      },
    ],
  });

  tailwindRuleTester.run("color-role-usage-nonterminal-apply", colorRoleUsageRule, {
    valid: [{ code: "@apply bg-brand text-brand border-brand bg-brand-canvas text-brand-ink border-brand-edge;" }],
    invalid: [
      {
        code: "@apply bg-button-canvas-2;",
        errors: [{ message: misplacedClass("bg-button-canvas-2", "canvas") }],
      },
      {
        code: "@apply hover:text-label-ink-1;",
        errors: [{ message: misplacedClass("hover:text-label-ink-1", "ink") }],
      },
      {
        code: "@apply border-frame-edge-border-color;",
        errors: [{ message: misplacedClass("border-frame-edge-border-color", "edge") }],
      },
      {
        code: "@apply text-button-canvas-2;",
        errors: [{ message: misplacedClass("text-button-canvas-2", "canvas") }],
      },
    ],
  });
});

void describe("Shared color tokens MAY be used without role suffixes in composite effects.", () => {
  tailwindRuleTester.run("color-role-usage-effects", colorRoleUsageRule, {
    valid: [
      {
        code: "@theme { --color-mc-dark: #2b2b2b; --color-mc-light: #545454; --inset-shadow-mc-frame: inset 1px 1px 0 var(--color-mc-dark), inset -1px -1px 0 var(--color-mc-light); }",
      },
    ],
    invalid: [
      {
        code: "@theme { --background-image-hero: linear-gradient(red, blue); }",
        errors: [{ message: backgroundImageNaming("--background-image-hero") }],
      },
    ],
  });
});
