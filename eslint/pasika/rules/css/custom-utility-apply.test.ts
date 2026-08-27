import { describe, cssRuleTester } from "./rule-tester.js";
import { customUtilityApplyRule } from "./custom-utility-apply.js";

void describe("A custom utility MUST use @apply for every styling declaration added by the project. When no named built-in utility represents a property value, it MUST apply the Tailwind custom-property or arbitrary-property utility instead.", () => {
  cssRuleTester.run("custom-utility-apply", customUtilityApplyRule, {
    valid: [
      // Custom utility styling through @apply
      {
        code: `@utility card {\n  @apply rounded-xl bg-white;\n}`,
      },
      // No custom utilities
      {
        code: `:root {\n  --primary-canvas: #ffffff;\n}`,
      },
    ],
    invalid: [
      // Raw CSS property inside a custom utility
      {
        code: `@utility card {\n  color: red;\n}`,
        errors: [{ message: 'Custom utility must use @apply for styling declaration "color".' }],
      },
      // @apply and a raw property mixed
      {
        code: `@utility card {\n  @apply rounded-xl;\n  background-color: white;\n}`,
        errors: [
          {
            message: 'Custom utility must use @apply for styling declaration "background-color".',
          },
        ],
      },
    ],
  });
});
