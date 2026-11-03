import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { baseLayerPairRule } from "./base-layer-pair";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("The global base layer MUST apply project-defined semantic background and foreground color utilities to the document body.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-global-base-")));
  const filename = (name: string): string => path.join(fixture, "src", "app", "styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(
    filename("base.css"),
    "@theme { --color-surface: #fff; --color-content: #111; } @layer base { body { @apply bg-surface text-content; } }",
  );
  writeFileSync(filename("other.css"), "@layer base { html { @apply bg-surface; } }");

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("base-layer-pair", baseLayerPairRule, {
      valid: [
        {
          filename: filename("globals.css"),
          code: "@theme { --color-surface: #fff; --color-content: #111; }\n@layer base {\n  body {\n    @apply bg-surface text-content;\n  }\n}",
        },
        {
          filename: filename("globals.css"),
          code: ":root {\n  --color-brand: #2563eb;\n}",
        },
        {
          filename: filename("globals.css"),
          code: '@import "tailwindcss";\n@import "./base.css";',
        },
        {
          filename: filename("other.css"),
          code: "@layer base { html { @apply bg-surface; } }",
        },
      ],
      invalid: [
        {
          filename: filename("globals.css"),
          code: "@theme { --color-surface: white; }\n@layer base { body { @apply bg-surface text-lg; } }",
          errors: [
            {
              message:
                "The global base layer must apply theme-defined background and foreground color utilities to the document body.",
            },
          ],
        },
        {
          filename: filename("globals.css"),
          code: "@layer base { body { @apply bg-surface text-content; } }",
          errors: [
            {
              message:
                "The global base layer must apply theme-defined background and foreground color utilities to the document body.",
            },
          ],
        },
        {
          filename: filename("globals.css"),
          code: "@layer base {\n  body {\n    @apply bg-white;\n  }\n}",
          errors: [
            {
              message:
                "The global base layer must apply theme-defined background and foreground color utilities to the document body.",
            },
          ],
        },
        {
          filename: filename("globals.css"),
          code: "@layer base {\n  html {\n    @apply bg-base-canvas;\n  }\n}",
          errors: [
            {
              message:
                "The global base layer must apply theme-defined background and foreground color utilities to the document body.",
            },
          ],
        },
        {
          filename: filename("globals.css"),
          code: '@import "tailwindcss";\n@import "./other.css";',
          errors: [
            {
              message:
                "The global base layer must apply theme-defined background and foreground color utilities to the document body.",
            },
          ],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});
