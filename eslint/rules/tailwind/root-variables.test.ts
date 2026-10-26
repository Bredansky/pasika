import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { rootVariablesRule } from "./root-variables";
import { describe, tailwindRuleTester } from "./rule-tester";

const INLINE = "Define design tokens with direct values in @theme, not @theme inline.";
const INDIRECT = "Define design tokens that reference CSS variables via var() in @theme inline.";
const ROOT = 'Token "--color-brand" is already defined in @theme; remove its duplicate default :root declaration.';

void describe("A Tailwind token without `var()` in its value MUST be declared in `@theme`.", () => {
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
        code: '@theme { --color-brand: #ffffff; }\n[data-theme="dark"] { --color-brand: #111111; }',
      },
      {
        code: "@theme { --color-brand: #ffffff; }\n@media (prefers-color-scheme: dark) { :root { --color-brand: #111111; } }",
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

void describe("A Tailwind token with `var()` in its value MUST be declared in `@theme inline`.", () => {
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

void describe("A token defined in `@theme` MUST NOT be defined again in the default `:root`. Theme-specific selectors or conditions such as `@media` MAY override it.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-theme-scopes-")));
  const filename = (name: string): string => path.join(fixture, "src/app/styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("globals.css"), '@import "tailwindcss";\n@import "./tokens.css";\n@import "./overrides.css";');
  writeFileSync(filename("tokens.css"), "@theme { --color-brand: #ffffff; }");
  writeFileSync(filename("overrides.css"), ":root { --color-brand: #111111; }");

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("root-variables-scopes", rootVariablesRule, {
      valid: [
        {
          filename: filename("overrides.css"),
          code: '[data-theme="dark"] { --color-brand: #111111; }',
        },
        {
          filename: filename("overrides.css"),
          code: "@media (prefers-color-scheme: dark) { :root { --color-brand: #111111; } }",
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
          errors: [{ message: ROOT }],
        },
        {
          filename: filename("overrides.css"),
          code: "@layer base { :root { --color-brand: #111111; } }",
          errors: [{ message: ROOT }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});
