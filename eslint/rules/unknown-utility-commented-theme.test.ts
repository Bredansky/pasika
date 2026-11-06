import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { unknownUtilityRule } from "./unknown-utility";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-commented-theme-")));
const globals = path.join(root, "src", "app", "styles", "globals.css");
mkdirSync(path.dirname(globals), { recursive: true });
writeFileSync(
  globals,
  [
    '@import "tailwindcss";',
    "@theme inline {",
    "  --*: initial;",
    "  /* Shared spacing scale */",
    "  --spacing: 0.25rem;",
    "  /* --color-only-in-comment: #ffffff; */",
    "}",
  ].join("\n"),
);
process.chdir(root);

void describe("Theme comments MUST NOT hide the base spacing token or register commented-out values.", () => {
  ruleTester.run("unknown-utility-commented-theme", unknownUtilityRule, {
    valid: [
      {
        code: '<div className="px-4 gap-2 top-1/4 left-1/2 inset-0" />',
        filename: srcFile("shared/spaced.tsx"),
      },
    ],
    invalid: [
      {
        code: '<div className="text-only-in-comment" />',
        filename: srcFile("shared/spaced.tsx"),
        errors: [
          {
            message:
              'Utility class "text-only-in-comment" is not a custom @utility, a theme-generated utility, or a built-in Tailwind utility.',
          },
        ],
      },
    ],
  });
});
