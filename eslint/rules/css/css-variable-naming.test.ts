import { describe, cssRuleTester } from "./rule-tester";
import { cssVariableNamingRule } from "./css-variable-naming";

void describe("A CSS variable intended only for a background MUST be named --<role>-canvas, and one intended only for readable text MUST be named --<role>-ink. When a named custom utility exposes one of those values by itself, it MUST use bg-<role>-canvas or text-<role>-ink.", () => {
  cssRuleTester.run("css-variable-naming", cssVariableNamingRule, {
    valid: [
      // Properly named canvas and ink variables
      {
        code: `:root {\n  --primary-canvas: #ffffff;\n  --primary-ink: #111827;\n}`,
      },
      // Variables without bg/text intent
      {
        code: `:root {\n  --color-brand: #2563eb;\n  --radius-card: 0.5rem;\n}`,
      },
    ],
    invalid: [
      // Background variable not ending in -canvas
      {
        code: `:root {\n  --card-bg: #ffffff;\n}`,
        errors: [
          {
            message: 'CSS variable "--card-bg" looks like a background token; name it --<role>-canvas instead.',
          },
        ],
      },
      // Text variable not ending in -ink
      {
        code: `:root {\n  --body-text: #111827;\n}`,
        errors: [
          {
            message: 'CSS variable "--body-text" looks like a text token; name it --<role>-ink instead.',
          },
        ],
      },
    ],
  });
});
