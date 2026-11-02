import path from "node:path";
import { atRuleSpacingRule } from "./at-rule-spacing";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("Adjacent top-level CSS `@` directives MUST have a blank line between them, except consecutive `@import` directives.", () => {
  const filename = path.resolve("src/app/styles/app-shell.css");
  tailwindRuleTester.run("at-rule-spacing", atRuleSpacingRule, {
    valid: [
      { filename, code: "@theme { --color-brand: red; }\n\n@utility card { display: block; }" },
      { filename, code: '@import "tailwindcss";\n@import "./tokens.css";\n\n@theme { --color-brand: red; }' },
      { filename, code: "@media (min-width: 1px) {\n  @apply block;\n}\n\n@keyframes fade { to { opacity: 1; } }" },
      { filename, code: "@media (min-width: 1px) {\n  @supports (display: grid) { .box { display: grid; } }\n}" },
      { filename, code: "@theme { --color-brand: red; }\r\n\r\n@utility card { display: block; }" },
      { filename, code: "@theme { --color-brand: red; }\n\n/* Utilities */\n@utility card { display: block; }" },
    ],
    invalid: [
      {
        filename,
        code: "@theme { --color-brand: red; }\n@utility card { display: block; }",
        output: "@theme { --color-brand: red; }\n\n@utility card { display: block; }",
        errors: [{ message: "Adjacent top-level @ rules must have a blank line between them." }],
      },
      {
        filename,
        code: "@utility one { display: block; }@utility two { display: flex; }",
        output: "@utility one { display: block; }\n\n@utility two { display: flex; }",
        errors: [{ message: "Adjacent top-level @ rules must have a blank line between them." }],
      },
      {
        filename,
        code: '@import "./tokens.css";\n@theme { --color-brand: red; }',
        output: '@import "./tokens.css";\n\n@theme { --color-brand: red; }',
        errors: [{ message: "Adjacent top-level @ rules must have a blank line between them." }],
      },
      {
        filename,
        code: "@theme { --color-brand: red; }\r\n@utility card { display: block; }",
        output: "@theme { --color-brand: red; }\r\n\r\n@utility card { display: block; }",
        errors: [{ message: "Adjacent top-level @ rules must have a blank line between them." }],
      },
      {
        filename,
        code: "@theme { --color-brand: red; }\n/* Utilities */\n@utility card { display: block; }",
        output: "@theme { --color-brand: red; }\n/* Utilities */\n\n@utility card { display: block; }",
        errors: [{ message: "Adjacent top-level @ rules must have a blank line between them." }],
      },
    ],
  });
});
