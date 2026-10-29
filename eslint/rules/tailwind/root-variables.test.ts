import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { rootVariablesRule } from "./root-variables";
import { describe, tailwindRuleTester } from "./rule-tester";

const INLINE = "Define design tokens with direct values in @theme, not @theme inline.";
const INDIRECT = "Define design tokens that reference CSS variables via var() in @theme inline.";
const rootDuplicate = (name: string): string =>
  `Token "${name}" is already defined in @theme; remove its duplicate default :root declaration.`;
const tokenOverride = (token: string): string =>
  `Tailwind token "${token}" must not be redeclared outside @theme; map it through @theme inline to its same-named runtime variable instead.`;
const missingDefault = (token: string): string =>
  `Tailwind token "${token}" references "${token}" without a default :root declaration.`;
const wrongVariable = (token: string, variable: string): string =>
  `Tailwind token "${token}" must reference its same-named CSS variable, not "${variable}".`;

void describe("Tailwind tokens MUST use `@theme inline` when referencing `var()`, and `@theme` otherwise.", () => {
  tailwindRuleTester.run("root-variables", rootVariablesRule, {
    valid: [
      { code: "@theme { --color-brand: #2563eb; }" },
      { code: "@theme { --*: initial; --color-brand: #2563eb; }" },
      { code: "@theme { --color-brand: #2563eb; --color-ink: #111827 }" },
      { code: ":root { --color-brand: #2563eb; } @theme inline { --color-brand: var(--color-brand); }" },
      { code: ":root { --shadow-custom: 2px; } @theme inline { --shadow-custom: calc(2px + var(--shadow-custom)); }" },
      { code: ":root { --color-surface: 150 60% 50%; } @theme inline { --color-surface: hsl(var(--color-surface)); }" },
      { code: ":root { --color-brand: 37 99 235; } @theme inline { --color-brand: rgb(\n  var(--color-brand)\n); }" },
      {
        code: ":root { --color-surface: white; } @theme { --color-brand: #2563eb; } @theme inline { --color-surface: var(--color-surface); }",
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
        code: "@theme inline { --color-brand: #2563eb; }",
        errors: [{ message: INLINE }],
      },
      {
        code: ":root { --color-brand: #2563eb; } @theme inline { --color-brand: var(--color-brand); --color-ink: #111827; }",
        errors: [{ message: INLINE }],
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
        code: "@theme { --shadow-custom: calc(2px + var(--offset)); }",
        errors: [{ message: INDIRECT }],
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

void describe("Tailwind tokens MUST use `@theme inline` when referencing `var()`, and `@theme` otherwise.", () => {
  tailwindRuleTester.run("root-variables-runtime", rootVariablesRule, {
    valid: [
      { code: ":root { --color-surface: white; } @theme inline { --color-surface: var(--color-surface); }" },
      {
        code: ":root { --color-surface: white; } .dark { --color-surface: black; } @theme inline { --color-surface: var(--color-surface); }",
      },
    ],
    invalid: [
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

void describe("Tokens using `@theme inline` MUST reference same-named variables defined in `:root`. Theme-specific overrides MUST preserve those names.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-runtime-tokens-")));
  const filename = (name: string): string => path.join(fixture, "src/app/styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("globals.css"), '@import "tailwindcss";\\n@import "./tokens.css";');
  writeFileSync(
    filename("tokens.css"),
    ":root { --color-accent-canvas: #ffffff; --radius-fluid: 8px; --font-sans: Arial, sans-serif; }",
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
          code: ":root { --color-primary-canvas: #ffffff; } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
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
          code: ":root { --color-primary-canvas: 255 255 255; } @theme inline { --color-primary-canvas: rgb(var(--color-primary-canvas)); }",
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
          code: ":root { --shadow-soft: 1px; } @theme inline { --shadow-soft: calc(var(--shadow-soft) + var(--shadow-soft)); }",
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
          errors: [{ message: missingDefault("--color-primary-canvas") }],
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
          errors: [{ message: wrongVariable("--shadow-soft", "--shadow-extra") }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});

void describe("Tokens declared in `@theme` MUST NOT be overridden in CSS selectors.", () => {
  tailwindRuleTester.run("root-variables-token-overrides", rootVariablesRule, {
    valid: [
      {
        code: ":root { --color-primary-canvas: #fafafa; } [data-theme=dark] { --color-primary-canvas: #18181b; } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
      },
      {
        code: "@theme { --color-primary-canvas: #fafafa; }",
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

void describe("Tokens declared in `@theme` MUST NOT be overridden in CSS selectors.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-theme-scopes-")));
  const filename = (name: string): string => path.join(fixture, "src/app/styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("globals.css"), '@import "tailwindcss";\n@import "./tokens.css";\n@import "./overrides.css";');
  writeFileSync(
    filename("tokens.css"),
    "@theme { --color-brand: #ffffff; --radius-card: 8px; --spacing: 0.25rem; } :root { --radius-fluid: 8px; } @theme inline { --radius-fluid: var(--radius-fluid); }",
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
