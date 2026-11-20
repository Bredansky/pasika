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

void describe("External CSS variables referenced through @apply inside @utility MUST likewise end with a comment naming the source npm package on the @apply line.", () => {
  const filename = path.resolve("src/app/styles/credentials.css");
  tailwindRuleTester.run("external-provider-comment:utility", externalProviderCommentRule, {
    valid: [
      {
        filename,
        code: "@utility transform-origin-radix-select {\n @apply origin-(--radix-select-content-transform-origin); /* @radix-ui/react-select */\n}",
      },
      {
        filename,
        code: "@utility transform-origin-radix-tooltip {\n @apply origin-(--radix-tooltip-content-transform-origin); /* @radix-ui/react-tooltip */\n}",
      },
      {
        filename,
        code: "@theme inline { --color-local: red; }\n@utility color-local {\n @apply bg-(--color-local);\n}",
      },
      {
        filename,
        code: "@utility safe-transform {\n @apply origin-top;\n}",
      },
    ],
    invalid: [
      {
        filename,
        code: "@utility transform-origin-radix-select {\n @apply origin-(--radix-select-content-transform-origin);\n}",
        errors: [
          {
            message:
              "External CSS variable mapping --radix-select-content-transform-origin in @apply MUST end with /* <npm-package-name> */ on the at-rule line.",
          },
        ],
      },
      {
        filename,
        code: "@utility transform-origin-radix-dropdown-menu {\n @apply origin-(--radix-dropdown-menu-content-transform-origin);\n}",
        errors: [
          {
            message:
              "External CSS variable mapping --radix-dropdown-menu-content-transform-origin in @apply MUST end with /* <npm-package-name> */ on the at-rule line.",
          },
        ],
      },
      {
        filename,
        code: "@utility transform-origin-radix-select {\n /* @radix-ui/react-select */\n @apply origin-(--radix-select-content-transform-origin);\n}",
        errors: [
          {
            message:
              "External CSS variable mapping --radix-select-content-transform-origin in @apply MUST end with /* <npm-package-name> */ on the at-rule line.",
          },
        ],
      },
      {
        filename,
        code: "@utility transform-origin-radix-select {\n @apply origin-(--radix-select-content-transform-origin); /* external Radix variable */\n}",
        errors: [
          {
            message:
              "External CSS variable mapping --radix-select-content-transform-origin in @apply MUST end with /* <npm-package-name> */ on the at-rule line.",
          },
        ],
      },
      {
        filename,
        code: "@utility custom-vendor-color {\n @apply bg-[var(--vendor-brand-color)];\n}",
        errors: [
          {
            message:
              "External CSS variable mapping --vendor-brand-color in @apply MUST end with /* <npm-package-name> */ on the at-rule line.",
          },
        ],
      },
    ],
  });
});
