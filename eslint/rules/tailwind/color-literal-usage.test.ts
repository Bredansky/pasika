import { colorLiteralUsageRule } from "./color-literal-usage";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("Fixed CSS colors MUST be defined in `--color-*` tokens and referenced through `var()` elsewhere.", () => {
  tailwindRuleTester.run("color-literal-usage", colorLiteralUsageRule, {
    valid: [
      {
        code: "@theme { --color-base-canvas: #fff; --color-primary-ink: rgb(10 20 30 / 50%); --color-tint: hsl(300 100% 50%); }",
      },
      { code: "@theme { --color-base-ink: black; --inset-shadow-mc-frame: inset 1px 1px 0 var(--color-base-ink); }" },
      { code: "@theme { --background-image-gradient-canvas: linear-gradient(var(--color-tint), transparent); }" },
      {
        code: "@theme { --color-base-canvas: #fefefe; --shadow-card: 0 0 0 rgb(from var(--color-base-canvas) r g b / 50%); }",
      },
      { code: ":root { --color-overlay: rgba(0, 0, 0, 0.5); } .card { background: var(--color-overlay); }" },
      { code: "@theme { --color-one: color(display-p3 0.8 0.3 0.1); }" },
      { code: ".icon { fill: currentColor; color: inherit; background: transparent; }" },
      { code: '.icon { filter: url(#fff); background-image: url("#fff"); }' },
      { code: '/* color: #fff; */ .card { content: "rgb(1, 2, 3)"; }' },
      { code: "@theme { --background-image-shape-canvas: linear-gradient(var(--color-a), var(--color-b)); }" },
    ],
    invalid: [
      {
        code: "@theme { --inset-shadow-mc-frame: inset 1px 1px 0 #2b2b2b; }",
        errors: [{ message: 'Move literal color "#2b2b2b" into a --color-* token and reference it with var().' }],
      },
      {
        code: "@theme { --background-image-boss-canvas: linear-gradient(#f0f, hsl(300 100% 30%)); }",
        errors: [
          { message: 'Move literal color "#f0f" into a --color-* token and reference it with var().' },
          { message: 'Move literal color "hsl(300 100% 30%)" into a --color-* token and reference it with var().' },
        ],
      },
      {
        code: ".card { box-shadow: inset 0 1px 0 rgba(255, 100, 255, 0.6); }",
        errors: [
          {
            message:
              'Move literal color "rgba(255, 100, 255, 0.6)" into a --color-* token and reference it with var().',
          },
        ],
      },
      {
        code: ".card { color: red; background-color: #fff; }",
        errors: [
          { message: 'Move literal color "red" into a --color-* token and reference it with var().' },
          { message: 'Move literal color "#fff" into a --color-* token and reference it with var().' },
        ],
      },
      {
        code: "@utility border-red { @apply [border-color:#ff0000]; }",
        errors: [{ message: 'Move literal color "#ff0000" into a --color-* token and reference it with var().' }],
      },
      {
        code: "@theme { --color-canvas: #ffffff; --text-shadow-card: 0 1px 0 #000; }",
        errors: [{ message: 'Move literal color "#000" into a --color-* token and reference it with var().' }],
      },
    ],
  });
});
