import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { rootVariablesRule } from "./root-variables";
import { describe, tailwindRuleTester } from "./rule-tester";

const INLINE = "Define design tokens with direct values in @theme, not @theme inline.";
const INDIRECT = "Define design tokens that reference CSS variables via var() in @theme inline.";
const tokenAlias = (name: string): string =>
  `Tailwind token "${name}" must define its own fixed value in @theme, not alias another theme token.`;
const MIXED = "Use either @theme or @theme inline across the project.";
const redundant = (name: string): string =>
  `Tailwind token "${name}" has no runtime overrides; define its value directly in @theme instead of using :root and @theme inline.`;
const rootDuplicate = (name: string): string =>
  `Token "${name}" is already defined in @theme; remove its duplicate default :root declaration.`;
const tokenOverride = (token: string): string =>
  `Tailwind token "${token}" must not be redeclared outside @theme; map it through @theme inline to its same-named runtime variable instead.`;
const missingDefault = (token: string): string =>
  `Tailwind token "${token}" references "${token}" without a default :root declaration.`;
const wrongVariable = (token: string, variable: string): string =>
  `Tailwind token "${token}" must reference its same-named CSS variable, not "${variable}".`;
const inlineMapping = (name: string): string =>
  `Tailwind token "${name}" must use a direct var(${name}) mapping in @theme inline.`;

void describe("Tailwind tokens MUST use plain `@theme` for fixed values or `@theme inline` for runtime variables.", () => {
  tailwindRuleTester.run("root-variables", rootVariablesRule, {
    valid: [
      { code: "@theme { --color-brand: #2563eb; }" },
      { code: "@theme { --*: initial; --color-brand: #2563eb; }" },
      { code: "@theme { --color-brand: #2563eb; --color-ink: #111827 }" },
      { code: "@theme { --color-primary-ink: #ffffff; --color-secondary-ink: #18181b; }" },
      {
        code: "@theme { --primary: 290 80% 65%; --retro-shadow: 270 40% 3%; --text-shadow-retro-emboss: 2px 2px 0 hsl(var(--retro-shadow)), -1px -1px 0 hsl(var(--primary) / 0.3); }",
      },
      {
        code: "@theme { --color-primary-canvas: hsl(290 80% 65%); --shadow-primary: 0 0 8px color-mix(in srgb, var(--color-primary-canvas) 30%, transparent); }",
      },
      {
        code: "@theme { --brand-hue: 290 80% 65%; --color-brand-canvas: hsl(var(--brand-hue)); --shadow-brand: 0 0 8px var(--color-brand-canvas); }",
      },
      {
        code: "@theme { --radius-base: 8px; --radius-button: 10px; --radius-chip: 12px; }",
      },
      {
        code: ":root { --color-brand: #2563eb; } .dark { --color-brand: #1d4ed8; } @theme inline { --color-brand: var(--color-brand); }",
      },
      {
        code: ":root { --shadow-custom: 2px; } .dark { --shadow-custom: 4px; } @theme inline { --shadow-custom: var(--shadow-custom); }",
      },
      {
        code: ":root { --color-surface: hsl(150 60% 50%); } .dark { --color-surface: hsl(150 30% 30%); } @theme inline { --color-surface: var(--color-surface); }",
      },
      {
        code: ":root { --color-brand: rgb(37 99 235); } .dark { --color-brand: rgb(29 78 216); } @theme inline { --color-brand: var(--color-brand); }",
      },
      { code: "@theme { --color-brand: #2563eb; /* --color-comment: var(--nope); */ }" },
      { code: '@theme { --font-label: "var(--literal)"; }' },
      {
        code: ":root { --color-surface: white; } .dark { --color-surface: black; } @theme inline { --color-surface: var(--color-surface); }",
      },
      { code: ":root { --runtime-brand: #2563eb; }" },
      // Intentional 1:1 @theme inline mappings are safe with the standard
      // Tailwind cascade: unlayered runtime declarations outrank @layer theme.
      // Preserve this contract for all namespaces, not only colors.
      {
        code: `:root {
  --color-control-edge: #d1d5db;
  --radius-control: 8px;
  --spacing-panel: 24px;
  --font-body: Arial, sans-serif;
  --shadow-card: 0 2px 4px #0003;
  --animate-enter: enter 200ms ease-out;
}
[data-theme="dark"] {
  --color-control-edge: #52525b;
  --radius-control: 10px;
  --shadow-card: 0 3px 8px #0006;
  --spacing-panel: 20px;
  --font-body: Georgia, serif;
  --animate-enter: enter 100ms ease-in;
}
@theme inline {
  --color-control-edge: var(--color-control-edge);
  --radius-control: var(--radius-control);
  --spacing-panel: var(--spacing-panel);
  --font-body: var(--font-body);
  --shadow-card: var(--shadow-card);
  --animate-enter: var(--animate-enter);
}`,
      },
      {
        code: ':root { --radius-card: 8px; } @theme inline { --radius-card: var(--radius-card); }\n[data-theme="dark"] { --radius-card: 10px; }',
      },
      {
        code: ":root { --radius-card: 8px; } @theme inline { --radius-card: var(--radius-card); }\n@media (prefers-color-scheme: dark) { :root { --radius-card: 10px; } }",
      },
    ],
    invalid: [
      {
        code: "@theme { --color-brand-canvas: #2563eb; --color-brand-edge: var(--color-brand-canvas); }",
        errors: [{ message: tokenAlias("--color-brand-edge") }],
      },
      {
        code: "@theme { --color-base-ink: #f9fafb; --color-dialog-ink: var(--color-base-ink); }",
        errors: [{ message: tokenAlias("--color-dialog-ink") }],
      },
      {
        code: ":root { --background-image-rainbow-gradient-canvas: linear-gradient(red, blue); } @theme inline { --background-image-rainbow-gradient-canvas: var(--background-image-rainbow-gradient-canvas); }",
        errors: [{ message: redundant("--background-image-rainbow-gradient-canvas") }],
      },
      {
        code: "@theme inline { --color-brand: #2563eb; }",
        errors: [{ message: INLINE }],
      },
      {
        code: ":root { --color-brand: #2563eb; } @theme inline { --color-brand: var(--color-brand); --color-ink: #111827; }",
        errors: [{ message: redundant("--color-brand") }, { message: INLINE }],
      },
      {
        code: "@theme inline { --color-brand: #2563eb; --color-ink: #111827; }",
        errors: [{ message: INLINE }, { message: INLINE }],
      },
      {
        code: "@theme { --color-surface: var(--surface); --color-ink: #111827; --color-accent: var(--accent); }",
        errors: [{ message: INDIRECT }, { message: INDIRECT }],
      },
      {
        code: "@theme { --color-brand: var(--runtime-brand); }",
        errors: [{ message: INDIRECT }],
      },
      {
        code: "@theme { --color-primary-ink: var(--color-primary-ink); }",
        errors: [{ message: INDIRECT }],
      },
      {
        code: "@theme { --color-primary-ink: var(--color-secondary-ink); --color-secondary-ink: var(--color-primary-ink); }",
        errors: [{ message: INDIRECT }, { message: INDIRECT }],
      },
      {
        code: "@theme { --shadow-custom: calc(2px + var(--offset)); }",
        errors: [{ message: INDIRECT }],
      },
      {
        code: "@theme { --primary: 290 80% 65%; --shadow-custom: 0 0 8px hsl(var(--primary)), 0 0 4px var(--runtime-color); }",
        errors: [{ message: INDIRECT }],
      },
      {
        code: "@theme { --alpha: hsl(var(--beta)); --beta: hsl(var(--alpha)); }",
        errors: [{ message: INDIRECT }, { message: INDIRECT }],
      },
      {
        code: "@theme { --brand: var(--not-in-theme); --shadow-brand: 0 0 8px var(--brand); }",
        errors: [{ message: INDIRECT }, { message: INDIRECT }],
      },
      {
        code: "@theme { --color-surface: rgb(\n  var(--surface)\n); }",
        errors: [{ message: INDIRECT }],
      },
      {
        code: '@theme inline { --font-label: "var(--literal)"; --font-body: Arial, sans-serif; }',
        errors: [{ message: INLINE }, { message: INLINE }],
      },
    ],
  });
});

void describe("Mixed theme strategies are rejected.", () => {
  tailwindRuleTester.run("root-variables-theme-strategy", rootVariablesRule, {
    valid: [
      { code: "@theme { --*: initial; --color-brand: #2563eb; }" },
      {
        code: ":root { --color-brand: white; } .dark { --color-brand: black; } @theme inline { --*: initial; --color-brand: var(--color-brand); }",
      },
    ],
    invalid: [
      {
        code: "@theme { --color-brand: blue; } @theme inline { --font-sans: var(--font-inter); }",
        errors: [{ message: MIXED }, { message: wrongVariable("--font-sans", "--font-inter") }],
      },
      {
        code: "@theme { --color-brand: blue; } @theme inline { --font-sans: var(--font-inter, Arial), sans-serif; --color-surface: var(--color-surface); }",
        errors: [
          { message: MIXED },
          { message: inlineMapping("--font-sans") },
          { message: missingDefault("--color-surface") },
        ],
      },
      {
        code: ":root { --color-surface: white; } .dark { --color-surface: black; } @theme { --color-brand: blue; } @theme inline { --color-surface: var(--color-surface); }",
        errors: [{ message: MIXED }],
      },
      {
        code: ":root { --color-surface: white; } .dark { --color-surface: black; } @theme { --*: initial; } @theme inline { --color-surface: var(--color-surface); }",
        errors: [{ message: MIXED }],
      },
      {
        code: "@theme { --color-brand: blue; @keyframes pulse { 50% { opacity: 0.5; } } } :root { --color-surface: white; } .dark { --color-surface: black; } @theme inline { --color-surface: var(--color-surface); }",
        errors: [{ message: MIXED }],
      },
    ],
  });
});

void describe("Theme strategies MUST also remain exclusive across stylesheets.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-theme-strategies-")));
  const filename = (name: string): string => path.join(fixture, "src/app/styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("tokens.css"), "@theme { --color-brand: blue; }");

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("root-variables-cross-file-theme-strategy", rootVariablesRule, {
      valid: [{ filename: filename("globals.css"), code: "@theme { --*: initial; }" }],
      invalid: [
        {
          filename: filename("globals.css"),
          code: "@theme inline { --font-sans: var(--font-inter, Arial), sans-serif; }",
          errors: [{ message: MIXED }, { message: inlineMapping("--font-sans") }],
        },
        {
          filename: filename("globals.css"),
          code: ":root { --color-surface: white; } .dark { --color-surface: black; } @theme inline { --color-surface: var(--color-surface); }",
          errors: [{ message: MIXED }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});

void describe("A CSS variable referenced by an `@theme inline` token with the same name MUST have a default `:root` declaration and at least one scoped, conditional, or programmatic override.", () => {
  tailwindRuleTester.run("root-variables-runtime", rootVariablesRule, {
    valid: [
      {
        code: ":root { --color-surface: white; } [data-theme=light] { --color-surface: #fafafa; } @theme inline { --color-surface: var(--color-surface); }",
      },
      {
        code: ":root { --color-surface: white; } .dark { --color-surface: black; } @theme inline { --color-surface: var(--color-surface); }",
      },
    ],
    invalid: [
      {
        code: ":root { --color-static-canvas: #ffffff; } @theme inline { --color-static-canvas: var(--color-static-canvas); }",
        errors: [{ message: redundant("--color-static-canvas") }],
      },
      {
        code: "@theme { --color-surface: hsl(var(--surface)); }",
        errors: [{ message: INDIRECT }],
      },
      {
        code: "@theme { --shadow-depth: calc(2px + var(--offset)); }",
        errors: [{ message: INDIRECT }],
      },
    ],
  });
});

void describe("A token in plain `@theme` MUST NOT be a direct `var()` alias of another token, regardless of token type.", () => {
  tailwindRuleTester.run("root-variables-no-token-aliases", rootVariablesRule, {
    valid: [
      { code: "@theme { --color-brand-canvas: #2563eb; }" },
      { code: "@theme { --radius-base: 8px; }" },
      {
        code: ":root { --color-brand-edge: #2563eb; } .dark { --color-brand-edge: #1d4ed8; } @theme inline { --color-brand-edge: var(--color-brand-edge); }",
      },
    ],
    invalid: [
      {
        code: "@theme { --color-brand-canvas: #2563eb; --color-brand-edge: var(--color-brand-canvas); }",
        errors: [{ message: tokenAlias("--color-brand-edge") }],
      },
      {
        code: "@theme { --color-base-ink: #f9fafb; --color-dialog-ink: var(--color-base-ink); }",
        errors: [{ message: tokenAlias("--color-dialog-ink") }],
      },
      {
        code: "@theme { --radius-base: 8px; --radius-button: var(--radius-base); }",
        errors: [{ message: tokenAlias("--radius-button") }],
      },
      {
        code: "@theme { --spacing-base: 1rem; --spacing-button: var(--spacing-base); }",
        errors: [{ message: tokenAlias("--spacing-button") }],
      },
    ],
  });
});

void describe("An `@theme inline` token MUST use a direct `var()` reference to its same-named CSS variable, without fallbacks, wrappers, or other expressions.", () => {
  tailwindRuleTester.run("root-variables-theme-references", rootVariablesRule, {
    valid: [
      {
        code: ":root { --color-primary-edge: white; } .dark { --color-primary-edge: black; } @theme inline { --color-primary-edge: var(--color-primary-edge); }",
      },
    ],
    invalid: [
      {
        code: "@theme { --color-primary-canvas: #aabbcc; } @theme inline { --color-primary-edge: var(--color-primary-canvas); }",
        errors: [{ message: MIXED }, { message: wrongVariable("--color-primary-edge", "--color-primary-canvas") }],
      },
      {
        code: "@theme { --font-heading: Georgia, serif; } @theme inline { --font-sans: var(--font-heading); }",
        errors: [{ message: MIXED }, { message: wrongVariable("--font-sans", "--font-heading") }],
      },
      {
        code: "@theme inline { --color-primary-edge: var(--unknown-primary); }",
        errors: [{ message: wrongVariable("--color-primary-edge", "--unknown-primary") }],
      },
      {
        code: ":root { --color-source: white; } .dark { --color-source: black; } @theme inline { --color-source: var(--color-source); --color-target: var(--color-source); }",
        errors: [{ message: wrongVariable("--color-target", "--color-source") }],
      },
    ],
  });
});

void describe("Inline theme mappings reject external variable names, fallbacks, and expressions.", () => {
  tailwindRuleTester.run("root-variables-direct-inline-mapping", rootVariablesRule, {
    valid: [
      {
        code: ":root { --font-sans: Arial; } .dark { --font-sans: Georgia; } @theme inline { --font-sans: var(--font-sans); }",
      },
    ],
    invalid: [
      {
        code: "@theme inline { --font-sans: var(--font-inter, Arial), sans-serif; }",
        errors: [{ message: inlineMapping("--font-sans") }],
      },
      {
        code: ":root { --font-sans: Arial; } .dark { --font-sans: Georgia; } @theme inline { --font-sans: var(--font-sans, Arial); }",
        errors: [{ message: inlineMapping("--font-sans") }],
      },
      {
        code: '@theme inline { --font-sans: var(--font-inter, "Helvetica Neue"), sans-serif; }',
        errors: [{ message: inlineMapping("--font-sans") }],
      },
      {
        code: "@theme inline { --font-sans: var(--font-inter, var(--font-system, Arial)), sans-serif; }",
        errors: [{ message: inlineMapping("--font-sans") }],
      },
      {
        code: "@theme inline { --font-sans: var(--font-inter), Arial, sans-serif; }",
        errors: [{ message: inlineMapping("--font-sans") }],
      },
      {
        code: "@theme inline { --font-sans: var(--font-inter, ), sans-serif; }",
        errors: [{ message: inlineMapping("--font-sans") }],
      },
      {
        code: "@theme inline { --font-sans: var(--font-inter); }",
        errors: [{ message: wrongVariable("--font-sans", "--font-inter") }],
      },
      {
        code: ":root { --font-heading: Arial; } .dark { --font-heading: Georgia; } @theme inline { --font-heading: var(--font-heading); --font-sans: var(--font-heading); }",
        errors: [{ message: wrongVariable("--font-sans", "--font-heading") }],
      },
      {
        code: ":root { --shadow-custom: 2px; } .dark { --shadow-custom: 4px; } @theme inline { --shadow-custom: calc(2px + var(--shadow-custom)); }",
        errors: [{ message: inlineMapping("--shadow-custom") }],
      },
      {
        code: ":root { --color-surface: #fff; } .dark { --color-surface: #000; } @theme inline { --color-surface: hsl(var(--color-surface)); }",
        errors: [{ message: inlineMapping("--color-surface") }],
      },
    ],
  });
});

void describe("Runtime mappings require unconditional defaults and matching overrides.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-runtime-tokens-")));
  const filename = (name: string): string => path.join(fixture, "src/app/styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("globals.css"), '@import "tailwindcss";\\n@import "./tokens.css";');
  writeFileSync(
    filename("tokens.css"),
    ":root { --color-accent-canvas: #ffffff; --radius-fluid: 8px; --font-sans: Arial, sans-serif; } .dark { --color-accent-canvas: #000000; --radius-fluid: 4px; --font-sans: Georgia, serif; }",
  );
  writeFileSync(
    path.join(fixture, "src/app/page.tsx"),
    'document.documentElement.style.setProperty("--radius-programmatic", "10px");',
  );

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("root-variables-token-default", rootVariablesRule, {
      valid: [
        {
          filename: filename("globals.css"),
          code: "@theme { --color-primary-canvas: #ffffff; }",
        },
        {
          filename: filename("globals.css"),
          code: "@theme { --brand-hue: 290 80% 65%; }",
        },
        {
          filename: filename("globals.css"),
          code: ":root { --color-primary-canvas: #ffffff; } .dark { --color-primary-canvas: #18181b; } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --color-accent-canvas: var(--color-accent-canvas); }",
        },
        {
          filename: filename("globals.css"),
          code: '[data-theme="dark"] { --color-accent-canvas: #18181b; } @theme inline { --color-accent-canvas: var(--color-accent-canvas); }',
        },
        {
          filename: filename("globals.css"),
          code: ":root { --color-primary-canvas: rgb(255 255 255); } .dark { --color-primary-canvas: rgb(0 0 0); } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --radius-fluid: var(--radius-fluid); }",
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --font-sans: var(--font-sans); }",
        },
        {
          filename: filename("globals.css"),
          code: ":root { --radius-card: 8px; } @theme inline { --radius-card: var(--radius-card); } [data-density=compact] { --radius-card: 4px; }",
        },
        {
          filename: filename("globals.css"),
          code: ":root { --radius-programmatic: 8px; } @theme inline { --radius-programmatic: var(--radius-programmatic); }",
        },
        {
          filename: filename("globals.css"),
          code: ":root { --shadow-soft: 1px; } .dark { --shadow-soft: 2px; } @theme inline { --shadow-soft: var(--shadow-soft); }",
        },
      ],
      invalid: [
        {
          filename: filename("globals.css"),
          code: "@theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
          errors: [{ message: missingDefault("--color-primary-canvas") }],
        },
        {
          filename: filename("globals.css"),
          code: ":root { --alias-canvas: #fafafa; } @theme inline { --color-primary-canvas: var(--alias-canvas); }",
          errors: [{ message: wrongVariable("--color-primary-canvas", "--alias-canvas") }],
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --color-primary-canvas: rgb(var(--color-primary-canvas)); }",
          errors: [{ message: inlineMapping("--color-primary-canvas") }],
        },
        {
          filename: filename("globals.css"),
          code: '[data-theme="dark"] { --color-primary-canvas: #18181b; } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }',
          errors: [{ message: missingDefault("--color-primary-canvas") }],
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --radius-card: var(--radius-card); }",
          errors: [{ message: missingDefault("--radius-card") }],
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --font-serif: var(--font-serif); }",
          errors: [{ message: missingDefault("--font-serif") }],
        },
        {
          filename: filename("globals.css"),
          code: ":root { --card-radius: 8px; } @theme inline { --radius-card: var(--card-radius); }",
          errors: [{ message: wrongVariable("--radius-card", "--card-radius") }],
        },
        {
          filename: filename("globals.css"),
          code: ":root { --font-inter: Arial, sans-serif; } @theme inline { --font-sans: var(--font-inter); }",
          errors: [{ message: wrongVariable("--font-sans", "--font-inter") }],
        },
        {
          filename: filename("globals.css"),
          code: ":root { --shadow-soft: 1px; --shadow-extra: 2px; } @theme inline { --shadow-soft: calc(var(--shadow-soft) + var(--shadow-extra)); }",
          errors: [{ message: inlineMapping("--shadow-soft") }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});

void describe("Tokens defined in plain `@theme` MUST NOT be redeclared outside `@theme`.", () => {
  tailwindRuleTester.run("root-variables-token-overrides", rootVariablesRule, {
    valid: [
      {
        code: ":root { --color-primary-canvas: #fafafa; } [data-theme=dark] { --color-primary-canvas: #18181b; } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
      },
      {
        code: "@theme { --color-primary-canvas: #fafafa; }",
      },
      {
        code: ":root { --color-primary-canvas: #fafafa; @variant dark { --color-primary-canvas: #18181b; } } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
      },
      {
        code: "@media (prefers-color-scheme: dark) { :root { --card-radius: 12px; } }",
      },
    ],
    invalid: [
      {
        code: '@theme { --color-primary-canvas: #fafafa; } [data-theme="dark"] { --color-primary-canvas: #18181b; }',
        errors: [{ message: tokenOverride("--color-primary-canvas") }],
      },
      {
        code: "@theme { --color-primary-canvas: #fafafa; } :root { @variant dark { --color-primary-canvas: #18181b; } }",
        errors: [{ message: tokenOverride("--color-primary-canvas") }],
      },
      {
        code: "@media (prefers-color-scheme: dark) { :root { --color-primary-canvas: #18181b; } }",
        errors: [{ message: tokenOverride("--color-primary-canvas") }],
      },
      {
        code: '@theme { --radius-card: 8px; } [data-theme="compact"] { --radius-card: 4px; }',
        errors: [{ message: tokenOverride("--radius-card") }],
      },
      {
        code: "@theme { --spacing: 0.25rem; } @media (min-width: 1000px) { :root { --spacing: 0.5rem; } }",
        errors: [{ message: tokenOverride("--spacing") }],
      },
      {
        code: "@theme { --font-sans: system-ui; } [data-theme=compact] { --font-sans: Arial; }",
        errors: [{ message: tokenOverride("--font-sans") }],
      },
    ],
  });
});

void describe("Tokens defined in plain `@theme` MUST NOT be redeclared outside `@theme`.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-theme-scopes-")));
  const filename = (name: string): string => path.join(fixture, "src/app/styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("globals.css"), '@import "tailwindcss";\n@import "./tokens.css";\n@import "./overrides.css";');
  writeFileSync(
    filename("tokens.css"),
    "@theme { --color-brand: #ffffff; --radius-card: 8px; --spacing: 0.25rem; } :root { --radius-fluid: 8px; } .dark { --radius-fluid: 4px; }",
  );
  writeFileSync(filename("overrides.css"), ":root { --color-brand: #111111; }");

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("root-variables-scopes", rootVariablesRule, {
      valid: [
        {
          filename: filename("overrides.css"),
          code: '[data-theme="dark"] { --card-radius: 10px; }',
        },
        {
          filename: filename("overrides.css"),
          code: '[data-theme="compact"] { --radius-fluid: 10px; }',
        },
        {
          filename: filename("overrides.css"),
          code: "@media (prefers-color-scheme: dark) { :root { --card-radius: 10px; } }",
        },
        {
          filename: filename("overrides.css"),
          code: "@media (prefers-reduced-motion: reduce) { :root { --radius-fluid: 0px; } }",
        },
        {
          filename: filename("overrides.css"),
          code: ":root { --custom-shadow: 0 2px 4px black; }",
        },
      ],
      invalid: [
        {
          filename: filename("overrides.css"),
          code: ":root { --color-brand: #111111; }",
          errors: [{ message: rootDuplicate("--color-brand") }],
        },
        {
          filename: filename("overrides.css"),
          code: "@layer base { :root { --color-brand: #111111; } }",
          errors: [{ message: rootDuplicate("--color-brand") }],
        },
        {
          filename: filename("overrides.css"),
          code: ":root { --radius-card: 10px; }",
          errors: [{ message: rootDuplicate("--radius-card") }],
        },
        {
          filename: filename("overrides.css"),
          code: '@media (min-width: 900px) { [data-theme="compact"] { --radius-card: 10px; } }',
          errors: [{ message: tokenOverride("--radius-card") }],
        },
        {
          filename: filename("overrides.css"),
          code: ":root { --spacing: 0.5rem; }",
          errors: [{ message: rootDuplicate("--spacing") }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});
