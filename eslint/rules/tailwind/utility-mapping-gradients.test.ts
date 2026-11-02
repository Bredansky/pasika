import { describe, tailwindRuleTester } from "./rule-tester";
import { utilityMappingRule } from "./utility-mapping";

void describe("Gradient-only `background` shorthands in custom utilities MUST prefer semantic `--background-image-...-canvas` theme tokens and generated `bg-*` classes, with shorthand reset behavior reviewed before migration.", () => {
  tailwindRuleTester.run("utility-mapping:gradient-shorthand", utilityMappingRule, {
    valid: [
      { code: "@utility bg-picture { @apply [background:url(hero.png)]; }" },
      { code: "@utility bg-solid { @apply [background:rebeccapurple]; }" },
      { code: "@utility bg-gradient-cover { @apply [background:linear-gradient(red,_blue)_center_/_cover]; }" },
      { code: "@utility bg-gradient-color { @apply [background:linear-gradient(red,_blue)_red]; }" },
      { code: "@utility bg-mixed-images { @apply [background:linear-gradient(red,_blue),_url(hero.png)]; }" },
    ],
    invalid: [
      {
        code: "@utility bg-scanlines-pattern { @apply [background:repeating-linear-gradient(0deg,_transparent_0_2px,_hsl(var(--primary)_/_0.03)_2px_4px)]; }",
        errors: [{ message: /--background-image-scanlines-pattern-canvas.*Replacing the background shorthand/u }],
      },
      {
        code: "@utility bg-layered-dots { @apply [background:radial-gradient(circle_at_25%_25%,_red_1px,_transparent_1px),_radial-gradient(circle_at_75%_75%,_blue_1px,_transparent_1px)]; }",
        errors: [{ message: /--background-image-layered-dots-canvas.*Replacing the background shorthand/u }],
      },
      {
        code: "@theme { --background-image-scanlines-canvas: linear-gradient(red, blue); } @utility bg-scanlines { @apply [background:linear-gradient(red,_blue)]; }",
        errors: [{ message: /duplicates theme-generated "bg-scanlines-canvas".*background shorthand reset behavior/u }],
      },
    ],
  });
});
