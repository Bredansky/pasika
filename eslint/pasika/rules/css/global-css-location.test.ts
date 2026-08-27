import { describe, cssRuleTester } from "./rule-tester.js";
import { globalCssLocationRule } from "./global-css-location.js";

void describe("The project's global CSS MUST live in the global stylesheet entry point and MUST NOT be imported from another file.", () => {
  cssRuleTester.run("global-css-location", globalCssLocationRule, {
    valid: [
      // The entry point that registers Tailwind
      {
        code: `@import "tailwindcss";\n\n@theme {\n  --*: initial;\n}`,
      },
      // Entry point with project CSS alongside the Tailwind import
      {
        code: `@import "tailwindcss";\n\n@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}`,
      },
      // Empty stylesheet
      {
        code: ``,
      },
    ],
    invalid: [
      // Project CSS in a file that does not register Tailwind
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}`,
        errors: [
          {
            message:
              "Global CSS must live in the global stylesheet entry point that registers Tailwind, not in this file.",
          },
        ],
      },
      // Importing other stylesheets without being the entry point
      {
        code: `@import "./theme.css";\n\n:root {\n  --color-brand: #2563eb;\n}`,
        errors: [
          {
            message:
              "Global CSS must live in the global stylesheet entry point that registers Tailwind, not in this file.",
          },
        ],
      },
    ],
  });
});
