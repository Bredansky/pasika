import { describe, cssRuleTester } from "./rule-tester";
import { baseLayerPairRule } from "./base-layer-pair";

void describe("The global base layer MUST apply base-canvas and base-ink to the document body as the default page pair.", () => {
  cssRuleTester.run("base-layer-pair", baseLayerPairRule, {
    valid: [
      // Body applies a canvas and an ink utility
      {
        code: `@layer base {\n  body {\n    @apply bg-base-canvas text-base-ink;\n  }\n}`,
      },
      // No base layer at all
      {
        code: `:root {\n  --color-brand: #2563eb;\n}`,
      },
    ],
    invalid: [
      // Base layer body applies neither canvas nor ink
      {
        code: `@layer base {\n  body {\n    @apply bg-white;\n  }\n}`,
        errors: [
          {
            message:
              "The global base layer must apply a canvas and an ink utility to the document body as the default page pair.",
          },
        ],
      },
      // Base layer with no body rule
      {
        code: `@layer base {\n  html {\n    @apply bg-base-canvas;\n  }\n}`,
        errors: [
          {
            message:
              "The global base layer must apply a canvas and an ink utility to the document body as the default page pair.",
          },
        ],
      },
    ],
  });
});
