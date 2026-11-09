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
      {
        filename,
        code: "@theme { --color-brand: red; }\n\n/* Group: features/home/card.tsx */\n@utility card { display: block; }",
      },
      {
        filename,
        code: "@theme { --color-brand: red; }\r\n\r\n/* Group: features/home/card.tsx */\r\n@utility card { display: block; }",
      },
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
      ...[
        ["\n", "\n"],
        ["\n", "\n\n"],
        ["\n\n", "\n\n"],
        ["\r\n", "\r\n\r\n"],
      ].map(([before, after]) => {
        const newline = before?.includes("\r\n") ? "\r\n" : "\n";
        const header = "/* Group: features/home/card.tsx */";
        const theme = "@theme { --color-brand: red; }";
        const utility = "@utility card { display: block; }";
        return {
          filename,
          code: `${theme}${before ?? ""}${header}${after ?? ""}${utility}`,
          output: `${theme}${newline}${newline}${header}${newline}${utility}`,
          errors: [
            {
              message:
                "A CSS consumer group comment must immediately precede its @ rule, with a blank line before the comment.",
            },
          ],
        };
      }),
    ],
  });
});
