import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe } from "vitest";
import { globalStylesheetRule } from "./global-stylesheet";
import { tailwindRuleTester } from "./rule-tester";

void describe("A repository MUST have one global stylesheet entry point that registers Tailwind.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-global-stylesheet-")));
  const filename = (name: string): string => path.join(fixture, "src", "app", "styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("globals.css"), '@import "tailwindcss";\n@import "./foundation.css";');
  writeFileSync(filename("foundation.css"), ":root { --brand: #2563eb; }");

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("global-stylesheet", globalStylesheetRule, {
      valid: [
        {
          filename: filename("globals.css"),
          code: '@import "tailwindcss";\n\n:root { --color-brand: #2563eb; }',
        },
        {
          filename: filename("globals.css"),
          code: '@import "tailwindcss";\n\n@layer base { body { @apply bg-base; } }',
        },
        {
          filename: filename("foundation.css"),
          code: ":root { --color-brand: #2563eb; }\n\nbody { @apply bg-base; }",
        },
      ],
      invalid: [
        {
          filename: filename("globals.css"),
          code: ":root { --color-brand: #2563eb; }\n\nbody { @apply bg-base; }",
          output: `@import "tailwindcss";\n:root { --color-brand: #2563eb; }\n\nbody { @apply bg-base; }`,
          errors: [{ message: 'Global stylesheet must register Tailwind with @import "tailwindcss".' }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});

void describe("Project CSS must have a canonical global stylesheet at src/app/styles/globals.css.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-missing-stylesheet-")));
  const filename = path.join(fixture, "src", "app", "styles", "foundation.css");
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, ":root { --brand: #2563eb; }");

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("global-stylesheet-missing", globalStylesheetRule, {
      valid: [],
      invalid: [
        {
          filename,
          code: ":root { --brand: #2563eb; }",
          errors: [{ message: "Project CSS must have a canonical global stylesheet at src/app/styles/globals.css." }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});
