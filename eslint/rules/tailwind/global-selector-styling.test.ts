import { describe, tailwindRuleTester } from "./rule-tester";
import { globalSelectorStylingRule } from "./global-selector-styling";

void describe("Outside `@layer base`, a global selector MAY only scope CSS variable overrides; element and component styling MUST stay in Tailwind classes at the consumer.", () => {
  tailwindRuleTester.run("global-selector-styling", globalSelectorStylingRule, {
    valid: [
      { code: `:root { --base-canvas: #fff; }\n.dark { --base-canvas: #000; }` },
      { code: `@layer base { body { @apply bg-base-canvas text-base-ink; } }` },
      { code: `@keyframes fade { from { opacity: 0; } to { opacity: 1; } }` },
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
