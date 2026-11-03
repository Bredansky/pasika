import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { baseLayerPairRule } from "./base-layer-pair";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("The global base layer MUST apply base-canvas and base-ink to the document body as the default page pair.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-global-base-")));
  const filename = (name: string): string => path.join(fixture, "src", "app", "styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(filename("base.css"), "@layer base { body { @apply bg-base-canvas text-base-ink; } }");
  writeFileSync(filename("other.css"), "@layer base { html { @apply bg-base-canvas; } }");

  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("base-layer-pair", baseLayerPairRule, {
      valid: [
        {
          filename: filename("globals.css"),
          code: "@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}",
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
          code: "@layer base { html { @apply bg-base-canvas; } }",
        },
      ],
      invalid: [
        {
          filename: filename("globals.css"),
          code: "@layer base {\n  body {\n    @apply bg-white;\n  }\n}",
          errors: [
            {
              message:
                "The global base layer must apply a canvas and an ink utility to the document body as the default page pair.",
            },
          ],
        },
        {
          filename: filename("globals.css"),
          code: "@layer base {\n  html {\n    @apply bg-base-canvas;\n  }\n}",
          errors: [
            {
              message:
                "The global base layer must apply a canvas and an ink utility to the document body as the default page pair.",
            },
          ],
        },
        {
          filename: filename("globals.css"),
          code: '@import "tailwindcss";\n@import "./other.css";',
          errors: [
            {
              message:
                "The global base layer must apply a canvas and an ink utility to the document body as the default page pair.",
            },
          ],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});
