import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { rootVariablesRule } from "./root-variables";
import { describe, tailwindRuleTester } from "./rule-tester";

const INLINE =
  "Define Tailwind tokens in @theme, never @theme inline; override the same token inside each theme scope.";
const INDIRECT =
  "Define theme token values directly in @theme; theme variants must override the token in their own CSS scope.";
const ROOT =
  'Theme token "--color-brand" already belongs to @theme; remove the unconditional :root redeclaration and use scoped theme overrides.';

void describe("A Tailwind design token MUST be defined directly in @theme, never @theme inline, and different themes MUST override that token in scoped selectors or conditional rules.", () => {
  tailwindRuleTester.run("root-variables", rootVariablesRule, {
    valid: [
      { code: "@theme { --color-brand: #2563eb; }" },
      { code: "@theme { --*: initial; --color-brand: #2563eb; }" },
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
        code: "@theme inline { --color-brand: var(--brand); }",
        errors: [{ message: INLINE }, { message: INDIRECT }],
      },
      {
        code: "@theme { --color-brand: var(--runtime-brand); }",
        errors: [{ message: INDIRECT }],
      },
      {
        code: "@theme { --shadow-custom: calc(2px + var(--offset)); }",
        errors: [{ message: INDIRECT }],
      },
    ],
  });
});

void describe("An unconditional :root block MUST NOT redeclare a token already defined in @theme; scoped or conditional overrides of the same token are allowed.", () => {
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
