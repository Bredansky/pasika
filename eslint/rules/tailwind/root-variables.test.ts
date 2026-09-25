import { describe, tailwindRuleTester } from "./rule-tester";
import { rootVariablesRule } from "./root-variables";

void describe("Shared styling values declared in the global stylesheet MUST be defined as CSS variables in `:root`. A Tailwind theme variable MUST reference that CSS variable through `@theme inline`.", () => {
  tailwindRuleTester.run("root-variables", rootVariablesRule, {
    valid: [
      // CSS variables in :root, referenced through @theme inline
      {
        code: `:root {\n  --color-brand: #2563eb;\n}\n\n@theme inline {\n  --color-brand: var(--color-brand);\n}`,
      },
      // :root variables without any theme block
      {
        code: `:root {\n  --surface-canvas: #ffffff;\n}`,
      },
    ],
    invalid: [
      // No :root block at all
      {
        code: `@theme {\n  --color-brand: #2563eb;\n}`,
        errors: [{ message: "Styling values must be defined as CSS variables in a :root block." }],
      },
      // Theme variable references a CSS variable but not through @theme inline
      {
        code: `:root {\n  --color-brand: #2563eb;\n}\n\n@theme {\n  --color-brand: var(--color-brand);\n}`,
        errors: [{ message: "Tailwind theme variables that reference CSS variables must use @theme inline." }],
      },
    ],
  });
});
