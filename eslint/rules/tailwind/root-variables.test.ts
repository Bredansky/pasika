import { rootVariablesRule } from "./root-variables";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("A Tailwind theme value that references a CSS variable MUST use @theme inline; direct values MAY be defined in @theme without a :root counterpart.", () => {
  tailwindRuleTester.run("root-variables", rootVariablesRule, {
    valid: [
      { code: "@theme { --color-brand: #2563eb; }" },
      { code: ":root { --runtime-brand: #2563eb; }\n@theme inline { --color-brand: var(--runtime-brand); }" },
      { code: "@theme inline { --color-brand: var(--runtime-brand, #2563eb); }" },
      { code: "@theme { --*: initial; --color-brand: #2563eb; }" },
      { code: ":root { --runtime-brand: #2563eb; }" },
      { code: "@theme { /* --color-brand: var(--runtime); */ --color-brand: #2563eb; }" },
    ],
    invalid: [
      {
        code: "@theme { --color-brand: var(--runtime-brand); }",
        errors: [{ message: "Theme values that reference CSS variables must use @theme inline." }],
      },
      {
        code: "@theme inline { --color-primary: var(--primary); }\n@theme { --color-secondary: var(--secondary); }",
        errors: [{ message: "Theme values that reference CSS variables must use @theme inline." }],
      },
      {
        code: "@theme { --shadow-custom: calc(2px + var(--offset)); }",
        errors: [{ message: "Theme values that reference CSS variables must use @theme inline." }],
      },
    ],
  });
});
