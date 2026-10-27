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
  `Tailwind token "${token}" must not be redeclared outside @theme; override a separate runtime variable through @theme inline instead.`;
const NO_COLOR_DEFAULT =
  'Semantic color "--color-primary-canvas" references "--color-primary-canvas" without a default :root declaration.';
const WRONG_COLOR_VARIABLE =
  'Semantic color "--color-primary-canvas" must reference its matching CSS variable "--color-primary-canvas", not "--alias-canvas".';

void describe("Tailwind tokens MUST use `@theme inline` when referencing `var()`, and `@theme` otherwise.", () => {
  tailwindRuleTester.run("root-variables", rootVariablesRule, {
    valid: [
      { code: "@theme { --color-brand: #2563eb; }" },
      { code: "@theme { --*: initial; --color-brand: #2563eb; }" },
      { code: "@theme { --color-brand: #2563eb; --color-ink: #111827 }" },
      { code: "@theme inline { --color-brand: var(--brand); }" },
      { code: "@theme inline { --shadow-custom: calc(2px + var(--offset)); }" },
      { code: "@theme inline { --color-surface: hsl(var(--surface)); }" },
      { code: "@theme inline { --color-brand: rgb(\n  var(--runtime-brand)\n); }" },
      { code: "@theme { --color-brand: #2563eb; } @theme inline { --color-surface: var(--surface); }" },
      { code: "@theme { --color-brand: #2563eb; /* --color-comment: var(--nope); */ }" },
      { code: '@theme { --font-label: "var(--literal)"; }' },
      {
        code: ":root { --surface: white; } .dark { --surface: black; } @theme inline { --color-surface: var(--surface); }",
      },
      { code: ":root { --runtime-brand: #2563eb; }" },
      {
        code: '@theme inline { --radius-card: var(--card-radius); }\n[data-theme="dark"] { --card-radius: 10px; }',
      },
      {
        code: "@theme inline { --radius-card: var(--card-radius); }\n@media (prefers-color-scheme: dark) { :root { --card-radius: 10px; } }",
      },
    ],
    invalid: [
      {
        code: "@theme inline { --color-brand: #2563eb; }",
        errors: [{ message: INLINE }],
      },
      {
        code: "@theme inline { --color-brand: var(--brand); --color-ink: #111827; }",
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
      { code: "@theme inline { --color-surface: var(--surface); }" },
      {
        code: ":root { --surface: white; } .dark { --surface: black; } @theme inline { --color-surface: var(--surface); }",
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

void describe("Semantic color tokens using `var()` MUST reference same-named variables defined in the default `:root`.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-runtime-colors-")));
  const filename = (name: string): string => path.join(fixture, "src/app/styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("globals.css"), '@import "tailwindcss";\\n@import "./tokens.css";');
  writeFileSync(filename("tokens.css"), ":root { --color-accent-canvas: #ffffff; }");

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("root-variables-color-default", rootVariablesRule, {
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
      ],
      invalid: [
        {
          filename: filename("globals.css"),
          code: "@theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
          errors: [{ message: NO_COLOR_DEFAULT }],
        },
        {
          filename: filename("globals.css"),
          code: ":root { --alias-canvas: #fafafa; } @theme inline { --color-primary-canvas: var(--alias-canvas); }",
          errors: [{ message: WRONG_COLOR_VARIABLE }],
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --color-primary-canvas: rgb(var(--color-primary-canvas)); }",
          errors: [{ message: NO_COLOR_DEFAULT }],
        },
        {
          filename: filename("globals.css"),
          code: '[data-theme="dark"] { --color-primary-canvas: #18181b; } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }',
          errors: [{ message: NO_COLOR_DEFAULT }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});

void describe("Tailwind tokens MUST NOT be redeclared outside `@theme` or `@theme inline`, except same-named semantic color variables mapped through `@theme inline`.", () => {
  tailwindRuleTester.run("root-variables-color-overrides", rootVariablesRule, {
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
        code: ":root { --card-radius: 8px; } @theme inline { --radius-card: var(--card-radius); } [data-theme=compact] { --radius-card: 4px; }",
        errors: [{ message: tokenOverride("--radius-card") }],
      },
    ],
  });
});

void describe("Tailwind tokens MUST NOT be redeclared outside `@theme` or `@theme inline`, except same-named semantic color variables mapped through `@theme inline`.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-theme-scopes-")));
  const filename = (name: string): string => path.join(fixture, "src/app/styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("globals.css"), '@import "tailwindcss";\n@import "./tokens.css";\n@import "./overrides.css";');
  writeFileSync(filename("tokens.css"), "@theme { --color-brand: #ffffff; --radius-card: 8px; --spacing: 0.25rem; }");
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
          code: "@media (prefers-color-scheme: dark) { :root { --card-radius: 10px; } }",
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
