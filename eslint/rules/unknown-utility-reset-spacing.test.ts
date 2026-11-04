import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { unknownUtilityRule } from "./unknown-utility";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-reset-spacing-")));
const globals = path.join(root, "src", "app", "styles", "globals.css");
mkdirSync(path.dirname(globals), { recursive: true });
writeFileSync(globals, '@import "tailwindcss";\n@theme inline { --*: initial; --spacing-4: 1rem; }');
process.chdir(root);

const missing = (name: string): string =>
  `Utility class "${name}" is not a custom @utility, a theme-generated utility, or a built-in Tailwind utility.`;

void describe("Numeric spacing utilities MUST be backed by the base `--spacing` token after the global theme reset.", () => {
  ruleTester.run("unknown-utility-reset-spacing", unknownUtilityRule, {
    valid: [
      {
        code: '<div className="w-full mx-auto p-px border-2" />',
        filename: srcFile("shared/spaced.tsx"),
      },
    ],
    invalid: [
      {
        code: '<div className="p-4 px-4 gap-4 size-4 inset-4" />',
        filename: srcFile("shared/spaced.tsx"),
        errors: ["p-4", "px-4", "gap-4", "size-4", "inset-4"].map((name) => ({ message: missing(name) })),
      },
      {
        code: '<div className="p-2 px-2 gap-2 inset-0 size-0 translate-x-2" />',
        filename: srcFile("shared/spaced.tsx"),
        errors: ["p-2", "px-2", "gap-2", "inset-0", "size-0", "translate-x-2"].map((name) => ({
          message: missing(name),
        })),
      },
    ],
  });
});
