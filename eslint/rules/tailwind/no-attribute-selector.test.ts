import path from "node:path";
import { noAttributeSelectorRule } from "./no-attribute-selector";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("CSS selectors MUST NOT use attribute selectors; use explicit component classes instead.", () => {
  const filename = path.resolve("src/app/styles/globals.css");
  const error = { message: "CSS attribute selectors are forbidden. Use an explicit component class instead." };
  tailwindRuleTester.run("no-attribute-selector", noAttributeSelectorRule, {
    valid: [
      { filename, code: ".decorative { pointer-events: none; }" },
      { filename, code: ".card:hover, .card:focus-visible { opacity: 1; }" },
      { filename, code: "@layer base { body { margin: 0; } }" },
      { filename, code: ".decorative { @apply [pointer-events:none]; }" },
    ],
    invalid: [
      { filename, code: '[aria-hidden="true"].absolute { pointer-events: none; }', errors: [error] },
      { filename, code: '[data-state="open"] { display: block; }', errors: [error] },
      { filename, code: "button[disabled], input[required] { opacity: .5; }", errors: [error, error] },
      { filename, code: '@media (min-width: 600px) { .item[aria-expanded="true"] { color: red; } }', errors: [error] },
      { filename, code: ".card:not([hidden]) { display: block; }", errors: [error] },
    ],
  });
});
