import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { stylesheetOrderingRule } from "./stylesheet-ordering";

void describe("The global stylesheet entry point MUST order imports, `@custom-variant` definitions, `:root` variables and selectors or conditions that override them, `@theme` definitions, custom utilities, base styles, and keyframes in that order, except for an isolated `--*: initial` theme reset immediately after the Tailwind import.", () => {
  const globals = path.resolve("src/app/styles/globals.css");
  const partial = path.resolve("src/app/styles/tokens.css");
  tailwindRuleTester.run("stylesheet-ordering", stylesheetOrderingRule, {
    valid: [
      // Full stylesheet in the documented order
      {
        filename: globals,
        code: `@import "tailwindcss";\n\n@custom-variant dark (&:where(.dark, .dark *));\n\n:root {\n  --color-brand: #2563eb;\n}\n\n@theme {\n  --*: initial;\n}\n\n@utility card {\n  @apply rounded-xl bg-white;\n}\n\n@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}\n\n@keyframes fade {\n  from { opacity: 0; }\n  to { opacity: 1; }\n}`,
      },
      // Partial stylesheet: only imports and :root
      {
        filename: globals,
        code: `@import "tailwindcss";\n\n:root {\n  --color-brand: #2563eb;\n}`,
      },
      // An isolated reset follows Tailwind, before feature imports that define tokens.
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme { --*: initial; }\n@import "./home.css";\n@import "./mod.css";\n:root { --color-brand: red; }\n@theme { --color-base-canvas: white; }\n@utility card { @apply rounded-xl; }\n@layer base { body { @apply bg-base-canvas; } }\n@keyframes fade { to { opacity: 1; } }',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme inline { /* reset Tailwind defaults */ --*: initial; }\n@import "./home.css";',
      },
      // Imported partials are not subject to the entry point's ordering.
      {
        filename: partial,
        code: "@theme { --color-brand: red; }\n:root { --color-brand: blue; }",
      },
      {
        filename: globals,
        code: ':root { --color-brand: red; }\n[data-theme="dark"] { --color-brand: blue; }\n@theme inline { --color-brand: var(--color-brand); }',
      },
    ],
    invalid: [
      // @theme before :root
      {
        filename: globals,
        code: `@theme {\n  --*: initial;\n}\n\n:root {\n  --color-brand: #2563eb;\n}`,
        errors: [
          {
            message:
              'Global stylesheet sections must be ordered: imports, @custom-variant, :root, @theme, custom utilities, base styles, keyframes. Found "theme" before an earlier section.',
          },
        ],
      },
      // A scoped or conditional custom-property override after @theme is out of order.
      {
        filename: globals,
        code: '@theme { --color-brand: red; }\n[data-theme="dark"] { --color-brand: blue; }',
        errors: [
          {
            message:
              'Global stylesheet sections must be ordered: imports, @custom-variant, :root, @theme, custom utilities, base styles, keyframes. Found "theme" before an earlier section.',
          },
        ],
      },
      {
        filename: globals,
        code: "@theme { --color-brand: red; }\n@media (prefers-color-scheme: dark) { :root { --color-brand: blue; } }",
        errors: [
          {
            message:
              'Global stylesheet sections must be ordered: imports, @custom-variant, :root, @theme, custom utilities, base styles, keyframes. Found "theme" before an earlier section.',
          },
        ],
      },
      // Non-reset and mixed @theme blocks must remain after all feature imports.
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme { --color-base-canvas: white; }\n@import "./home.css";',
        errors: [
          {
            message:
              'Global stylesheet section "imports" cannot reappear after "theme". Keep all section occurrences in the required order.',
          },
        ],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme { --*: initial; --color-base-canvas: white; }\n@import "./home.css";',
        errors: [
          {
            message:
              'Global stylesheet section "imports" cannot reappear after "theme". Keep all section occurrences in the required order.',
          },
        ],
      },
      // A late reset erases theme variables from imported feature stylesheets.
      {
        filename: globals,
        code: '@import "tailwindcss";\n@import "./home.css";\n@theme { --*: initial; }',
        errors: [
          {
            message:
              "The global --*: initial theme reset must precede feature stylesheet imports, or it will erase their theme tokens.",
          },
        ],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@import "./home.css";\n@theme { --*: initial; --color-base-canvas: white; }',
        errors: [
          {
            message:
              "The global --*: initial theme reset must precede feature stylesheet imports, or it will erase their theme tokens.",
          },
        ],
      },
      // The exception cannot let other CSS sections precede feature imports.
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme { --*: initial; }\n@utility badge { display: inline; }\n@import "./home.css";',
        errors: [
          {
            message:
              'Global stylesheet section "imports" cannot reappear after "utility". Keep all section occurrences in the required order.',
          },
        ],
      },
      // The reset must follow the initial Tailwind import.
      {
        filename: globals,
        code: '@theme { --*: initial; }\n@import "tailwindcss";\n@import "./home.css";',
        errors: [
          {
            message:
              'Global stylesheet sections must be ordered: imports, @custom-variant, :root, @theme, custom utilities, base styles, keyframes. Found "theme" before an earlier section.',
          },
        ],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme { --*: initial; }\n@theme { --*: initial; }\n@import "./home.css";',
        errors: [
          {
            message:
              'Global stylesheet section "imports" cannot reappear after "theme". Keep all section occurrences in the required order.',
          },
        ],
      },
      {
        filename: globals,
        code: "@utility card { display: block; }\n@keyframes fade { to { opacity: 1; } }\n@utility badge { display: inline; }",
        errors: [
          {
            message:
              'Global stylesheet section "utility" cannot reappear after "keyframes". Keep all section occurrences in the required order.',
          },
        ],
      },
      // base styles before @theme
      {
        filename: globals,
        code: `@layer base {\n  body {\n    @apply bg-base-canvas;\n  }\n}\n\n@theme {\n  --*: initial;\n}`,
        errors: [
          {
            message:
              'Global stylesheet sections must be ordered: imports, @custom-variant, :root, @theme, custom utilities, base styles, keyframes. Found "base styles" before an earlier section.',
          },
        ],
      },
    ],
  });
});

void describe("The global stylesheet import tree MUST reset Tailwind's default theme with `--*: initial` in either `@theme` or `@theme inline`; when the reset is in `globals.css`, it MUST precede directly imported feature stylesheets to preserve their `@theme` tokens.", () => {
  const globals = path.resolve("src/app/styles/globals.css");
  tailwindRuleTester.run("stylesheet-ordering", stylesheetOrderingRule, {
    valid: [
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme { --*: initial; }\n@import "./home.css";',
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@theme { --*: initial }\n@import "./home.css";',
      },
    ],
    invalid: [
      {
        filename: globals,
        code: '@import "tailwindcss";\n@import "./home.css";\n@theme { --*: initial; }',
        errors: [
          {
            message:
              "The global --*: initial theme reset must precede feature stylesheet imports, or it will erase their theme tokens.",
          },
        ],
      },
      {
        filename: globals,
        code: '@import "tailwindcss";\n@import "./home.css";\n@theme { --*: initial }',
        errors: [
          {
            message:
              "The global --*: initial theme reset must precede feature stylesheet imports, or it will erase their theme tokens.",
          },
        ],
      },
    ],
  });
});
