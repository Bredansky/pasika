import { globalSelectorStylingRule } from "./global-selector-styling";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("Outside `@layer base`, global selectors MUST contain only CSS custom-property declarations, including default `:root` values and scoped or conditional overrides.", () => {
  tailwindRuleTester.run("global-selector-styling", globalSelectorStylingRule, {
    valid: [
      { code: `:root { --base-canvas: #fff; }\n.dark { --base-canvas: #000; }` },
      { code: `@layer base { body { @apply bg-base-canvas text-base-ink; } }` },
      { code: `@keyframes fade { from { opacity: 0; } to { opacity: 1; } }` },
      { code: "@media (prefers-color-scheme: dark) { :root { --base-canvas: #000; } }" },
      { code: "@layer components { .card { --card-radius: 12px; } }" },
    ],
    invalid: [
      {
        code: `.editor-sidebar-heading { @apply flex items-center gap-2; }`,
        errors: [
          {
            message:
              "Global selectors outside @layer base may only override CSS variables; keep element/component styling as Tailwind classes in the consumer.",
          },
        ],
      },
      {
        code: `[data-editor-sidebar-trigger="true"] { @apply flex w-full items-center justify-between; }`,
        errors: [
          {
            message:
              "Global selectors outside @layer base may only override CSS variables; keep element/component styling as Tailwind classes in the consumer.",
          },
        ],
      },
      {
        code: `.editor-sidebar-heading { display: flex; gap: 0.5rem; }`,
        errors: [
          {
            message:
              "Global selectors outside @layer base may only override CSS variables; keep element/component styling as Tailwind classes in the consumer.",
          },
        ],
      },
      {
        code: "@layer components { .card { @apply p-2; } }",
        errors: [
          {
            message:
              "Global selectors outside @layer base may only override CSS variables; keep element/component styling as Tailwind classes in the consumer.",
          },
        ],
      },
      {
        code: "@media (max-width: 600px) { .card { @apply p-2; } }",
        errors: [
          {
            message:
              "Global selectors outside @layer base may only override CSS variables; keep element/component styling as Tailwind classes in the consumer.",
          },
        ],
      },
      {
        code: `.dark { --base-canvas: #000; color: white; }`,
        errors: [
          {
            message:
              "Global selectors outside @layer base may only override CSS variables; keep element/component styling as Tailwind classes in the consumer.",
          },
        ],
      },
    ],
  });
});
