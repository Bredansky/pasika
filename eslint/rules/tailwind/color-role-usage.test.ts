import { colorRoleUsageRule } from "./color-role-usage";
import { describe, tailwindRuleTester } from "./rule-tester";

const naming = (token: string): string =>
  `Color token "${token}" needs a semantic role ending in -canvas, -ink, or -edge.`;
const mismatch = (className: string, role: string, purpose: string, expected: string): string =>
  `Color utility "${className}" uses a "${role}" token for ${purpose}; use a "${expected}" token instead.`;

void describe("Tailwind color tokens MUST use semantic suffixes (`-canvas`, `-ink`, `-edge`), and color utilities MUST match those roles: canvas for backgrounds, fills, gradients, and ring offsets; ink for text, carets, and text decoration; edge for borders, outlines, focus rings, dividers, and SVG strokes.", () => {
  tailwindRuleTester.run("color-role-usage-naming", colorRoleUsageRule, {
    valid: [
      { code: "@theme { --*: initial; --color-base-canvas: #fff; --color-base-ink: #111; --color-base-edge: #ccc; }" },
      { code: "@theme inline { --color-primary-canvas: var(--primary); }" },
      { code: ":root { --runtime-color: #fff; --tweet-card-name-text-size: 12px; }" },
      { code: "@theme { --radius-md: 4px; --text-card-title: 1rem; }" },
    ],
    invalid: [
      { code: "@theme { --color-blue-600: #2563eb; }", errors: [{ message: naming("--color-blue-600") }] },
      { code: "@theme { --color-button: #123456; }", errors: [{ message: naming("--color-button") }] },
      { code: "@theme { --color-border: #ccc; }", errors: [{ message: naming("--color-border") }] },
    ],
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
});
