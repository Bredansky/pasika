import { describe, tailwindRuleTester } from "./rule-tester";
import { cssVariableNamingRule } from "./css-variable-naming";

void describe("A CSS variable intended only for a background MUST be named --<role>-canvas, one intended only for readable text MUST be named --<role>-ink, and one intended only for a visual boundary such as a border, outline, ring, or stroke MUST be named --<role>-edge. When a named custom utility exposes one of those values by itself, it MUST use bg-<role>-canvas, text-<role>-ink, or <property>-<role>-edge.", () => {
  tailwindRuleTester.run("css-variable-naming", cssVariableNamingRule, {
    valid: [
      // Properly named canvas and ink variables
      {
        code: `:root {\n  --primary-canvas: #ffffff;\n  --primary-ink: #111827;\n  --control-edge: #d1d5db;\n}`,
      },
      // Variables without bg/text intent
      {
        code: `:root {\n  --color-brand: #2563eb;\n  --radius-card: 0.5rem;\n}`,
      },
      // Boundary-related dimensions are not colors
      {
        code: `:root {\n  --border-radius: 0.5rem;\n  --ring-offset-width: 2px;\n}`,
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
      // Boundary variable not ending in -edge
      {
        code: `:root {\n  --control-border: #d1d5db;\n  --focus-ring: #2563eb;\n}`,
        errors: [
          {
            message: 'CSS variable "--control-border" looks like a boundary token; name it --<role>-edge instead.',
          },
          {
            message: 'CSS variable "--focus-ring" looks like a boundary token; name it --<role>-edge instead.',
          },
        ],
      },
    ],
  });
});
