import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { themeResetRule } from "./theme-reset";

void describe("The global stylesheet MUST reset Tailwind's default theme with --*: initial.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-reset-tree-")));
  const filename = (name: string): string => path.join(fixture, "src", "app", "styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("tokens.css"), "@theme { --*: initial; --color-brand: #2563eb; }");

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("theme-reset", themeResetRule, {
      valid: [
        {
          filename: filename("globals.css"),
          code: "@theme {\n  --*: initial;\n}",
        },
        {
          filename: filename("globals.css"),
          code: "@theme {\n  --*: initial;\n  --color-brand: #2563eb;\n}",
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline {\n  --*: initial;\n  --color-brand: var(--color-brand);\n}",
        },
        {
          filename: filename("globals.css"),
          code: "@theme {\n  --*: initial;\n  --animate-pulse: pulse 2s infinite;\n  @keyframes pulse {\n    50% { opacity: 0.5; }\n  }\n}",
        },
        {
          filename: filename("globals.css"),
          code: '@import "tailwindcss";\n@import "./tokens.css";',
        },
        {
          filename: filename("tokens.css"),
          code: "@theme { --color-brand: #2563eb; }",
        },
      ],
      invalid: [
        {
          filename: filename("globals.css"),
          code: "@theme {\n  --color-brand: #2563eb;\n}",
          errors: [
            {
              message:
                "The global stylesheet must reset Tailwind's default theme with --*: initial inside an @theme block.",
            },
          ],
        },
        {
          filename: filename("globals.css"),
          code: ":root {\n  --color-brand: #2563eb;\n}",
          errors: [
            {
              message:
                "The global stylesheet must reset Tailwind's default theme with --*: initial inside an @theme block.",
            },
          ],
        },
        {
          filename: filename("globals.css"),
          code: "@theme { --*: unset; --color-brand: #2563eb; }",
          errors: [
            {
              message:
                "The global stylesheet must reset Tailwind's default theme with --*: initial inside an @theme block.",
            },
          ],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});
