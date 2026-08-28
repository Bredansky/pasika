import { describe, cssRuleTester } from "./rule-tester";
import { themeVariableNamespaceRule } from "./theme-variable-namespace";

void describe("A value that needs at least two utility classes from the same Tailwind theme-variable namespace MUST use that namespace and have the same name in :root.", () => {
  cssRuleTester.run("theme-variable-namespace", themeVariableNamespaceRule, {
    valid: [
      // Classes from the same namespace share a deeper prefix
      {
        code: `@theme {\n  --brand-surface-canvas: #ffffff;\n  --brand-surface-ink: #111827;\n}\n\n@layer base {\n  body {\n    @apply brand-surface-canvas brand-surface-ink;\n  }\n}`,
      },
      // No theme variables declared
      {
        code: `@layer base {\n  body {\n    @apply bg-white;\n  }\n}`,
      },
    ],
    invalid: [
      // Classes from one namespace without a shared prefix
      {
        code: `@theme {\n  --brand-ink: #111827;\n  --brand-surface: #ffffff;\n}\n\n@layer base {\n  body {\n    @apply brand-ink brand-surface;\n  }\n}`,
        errors: [
          {
            message:
              'Utility classes brand-ink, brand-surface use namespace "brand" but lack a shared prefix; use the theme-variable namespace prefix.',
          },
        ],
      },
    ],
  });
});
