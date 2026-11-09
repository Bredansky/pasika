import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { tailwindDefaultCommentRule } from "./tailwind-default-comment";

void describe("Theme tokens with values identical to the installed Tailwind defaults MUST end with `/* Tailwind default */` on the same declaration line, distinguishing required re-declarations after `--*: initial` from custom overrides.", () => {
  const filename = path.resolve("src/app/styles/globals.css");
  const error = (token: string): { message: string } => ({
    message: `Tailwind default token ${token} MUST end with /* Tailwind default */ on the declaration line.`,
  });
  tailwindRuleTester.run("tailwind-default-comment", tailwindDefaultCommentRule, {
    valid: [
      { filename, code: "@theme inline {\n --text-sm: 0.875rem; /* Tailwind default */\n}" },
      { filename, code: "@theme inline {\n --text-sm: 1rem;\n --tracking-retro: .35em;\n}" },
      { filename, code: "@theme inline {\n --text-sm--letter-spacing: 0.015em;\n}" },
      { filename, code: "@theme inline {\n --leading-normal: 1.5; /* Tailwind default */\n}" },
      { filename, code: ".a { --text-sm: 0.875rem; }" },
      { filename, code: "@theme inline {\n --color-brand: red;\n}" },
    ],
    invalid: [
      { filename, code: "@theme inline {\n --text-sm: 0.875rem;\n}", errors: [error("--text-sm")] },
      { filename, code: "@theme inline {\n --font-weight-bold: 700;\n}", errors: [error("--font-weight-bold")] },
      { filename, code: "@theme inline {\n --tracking-widest: 0.1em;\n}", errors: [error("--tracking-widest")] },
      {
        filename,
        code: "@theme inline {\n --leading-tight: 1.25; /* comment before */\n}",
        errors: [error("--leading-tight")],
      },
      {
        filename,
        code: "@theme inline {\n --text-xs: 0.75rem;\n /* Tailwind default */\n}",
        errors: [error("--text-xs")],
      },
      {
        filename,
        code: "@theme inline {\n --text-xs: 0.75rem; /* Tailwind default */\n --text-lg: 1.125rem;\n}",
        errors: [error("--text-lg")],
      },
    ],
  });
});
