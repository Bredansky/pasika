import path from "node:path";
import { noSimpleClassRule } from "./no-simple-class-rule";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("Standalone CSS class selectors MUST NOT replace Tailwind utilities applied on elements.", () => {
  const filename = path.resolve("src/app/styles/globals.css");
  const error = {
    message: "Simple CSS class rules are forbidden. Apply Tailwind utilities directly on the element instead.",
  };
  tailwindRuleTester.run("no-simple-class-rule", noSimpleClassRule, {
    valid: [
      { filename, code: "body { margin: 0; }" },
      { filename, code: ".card:hover { opacity: 1; }" },
      { filename, code: ".card > .icon { display: inline; }" },
      { filename, code: ":root { --brand: red; }" },
      { filename, code: "@utility decorative { @apply pointer-events-none; }" },
      { filename, code: "@keyframes fade { to { opacity: 1; } }" },
    ],
    invalid: [
      { filename, code: ".decorative { pointer-events: none; }", errors: [error] },
      { filename, code: ".decorative { @apply pointer-events-none; }", errors: [error] },
      { filename, code: "@media (min-width: 600px) { .decorative { display: none; } }", errors: [error] },
      { filename, code: ".foo, .bar:hover { color: red; }", errors: [error] },
    ],
  });
});
