import { describe, cssRuleTester } from "./rule-tester.js";
import { rootVariablesRule } from "./root-variables.js";

void describe("Every value used for the project's styling MUST be defined as a CSS variable in :root, even when no theme selector overrides it. A Tailwind theme variable MUST reference that CSS variable through @theme inline.", () => {
  cssRuleTester.run("root-variables", rootVariablesRule, {
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
