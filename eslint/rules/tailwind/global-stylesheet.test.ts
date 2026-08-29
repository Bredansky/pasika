import { describe } from "node:test";
import { globalStylesheetRule } from "./global-stylesheet";
import { tailwindRuleTester } from "./rule-tester";

void describe("A repository MUST have one global stylesheet entry point that registers Tailwind.", () => {
  tailwindRuleTester.run("global-stylesheet", globalStylesheetRule, {
    valid: [
      {
        code: `@import "tailwindcss";\n\n:root { --color-brand: #2563eb; }`,
      },
      {
        code: `@import "tailwindcss";\n\n@layer base { body { @apply bg-base; } }`,
      },
    ],
    invalid: [
      {
        code: `:root { --color-brand: #2563eb; }\n\nbody { @apply bg-base; }`,
        errors: [{ message: 'Global stylesheet must register Tailwind with @import "tailwindcss".' }],
      },
    ],
  });
});
