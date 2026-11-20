import path from "node:path";
import { externalProviderCommentRule } from "./external-provider-comment";
import { describe, tailwindRuleTester } from "./rule-tester";

void describe("Theme tokens that map to CSS variables supplied by external packages MUST end with a comment naming the source npm package on the same declaration line.", () => {
  const filename = path.resolve("src/app/styles/credentials.css");
  const error = (token: string): { message: string } => ({
    message: `External CSS variable mapping ${token} MUST end with /* <npm-package-name> */ on the declaration line.`,
  });
  tailwindRuleTester.run("external-provider-comment", externalProviderCommentRule, {
    valid: [
      {
        filename,
        code: "@theme inline {\n --spacing-radix-select-available: var(--radix-select-content-available-height); /* @radix-ui/react-select */\n}",
      },
      {
        filename,
        code: "@theme inline {\n --color-brand-canvas: var(--vendor-brand-color, #2563eb); /* @company/tokens */\n}",
      },
      {
        filename,
        code: "@theme inline {\n --font-sans: var(--font-inter, Arial); /* next */\n}",
      },
      { filename, code: "@theme inline { --radius-card: 8px; }" },
      {
        filename,
        code: ":root { --color-primary: red; } @theme inline { --color-brand-canvas: var(--color-primary); }",
      },
      { filename, code: "@theme { --color-brand-canvas: var(--vendor-brand, red); }" },
    ],
    invalid: [
      {
        filename,
        code: "@theme inline {\n --spacing-radix-select-available: var(--radix-select-content-available-height);\n}",
        errors: [error("--spacing-radix-select-available")],
      },
      {
        filename,
        code: "@theme inline {\n --color-brand-canvas: var(--vendor-color, blue); /* External variable */\n}",
        errors: [error("--color-brand-canvas")],
      },
      {
        filename,
        code: "@theme inline {\n /* @radix-ui/react-select */\n --spacing-radix-select-available: var(--radix-select-content-available-height);\n}",
        errors: [error("--spacing-radix-select-available")],
      },
      {
        filename,
        code: "@theme inline {\n --spacing-radix-select-available: var(--radix-select-content-available-height); /* @radix-ui/react-select */\n --font-sans: var(--font-inter, Arial);\n}",
        errors: [error("--font-sans")],
      },
    ],
  });
});
