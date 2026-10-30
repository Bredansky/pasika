import { applyUsageRule } from "./apply-usage";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("Non-custom-property style declarations in global selectors inside `@layer base` MUST use `@apply` instead of raw CSS properties.", () => {
  tailwindRuleTester.run("apply-usage", applyUsageRule, {
    valid: [
      { code: `@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}` },
      { code: `:root { --base-canvas: #fff; }\n.dark { --base-canvas: #000; }` },
      { code: `@theme {\n  --*: initial;\n}` },
      { code: `@keyframes fade { from { opacity: 0; } to { opacity: 1; } }` },
      { code: "@layer base { @media (max-width: 600px) { body { @apply bg-base-canvas; } } }" },
    ],
    invalid: [
      {
        code: `@layer base {\n  body {\n    background-color: #ffffff;\n  }\n}`,
        errors: [{ message: 'Style declaration "background-color" inside a global selector must use @apply.' }],
      },
      {
        code: "@layer base { @media (max-width: 600px) { body { color: red; } } }",
        errors: [{ message: 'Style declaration "color" inside a global selector must use @apply.' }],
      },
      {
        code: `.component { display: flex; align-items: center; }`,
        errors: [
          { message: 'Style declaration "display" inside a global selector must use @apply.' },
          { message: 'Style declaration "align-items" inside a global selector must use @apply.' },
        ],
      },
      {
        code: `[data-component="true"] { min-height: 7.5rem; @apply p-2; }`,
        errors: [{ message: 'Style declaration "min-height" inside a global selector must use @apply.' }],
      },
      {
        code: `.component { &:where([data-state="open"]) { transform: rotate(180deg); } }`,
        errors: [{ message: 'Style declaration "transform" inside a global selector must use @apply.' }],
      },
    ],
  });
});
