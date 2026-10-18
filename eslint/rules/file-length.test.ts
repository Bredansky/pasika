import { describe, ruleTester, srcFile } from "../rule-tester";
import { fileLengthRule } from "./file-length";

const sourceWithLines = (lineCount: number): string =>
  Array.from({ length: lineCount }, (_, index) => `export const value${String(index)} = ${String(index)};`).join("\n");

const localeSourceWithLines = (lineCount: number): string =>
  `export const locales = {\n${Array.from({ length: lineCount }, (_, index) => `  key${String(index)}: "text",`).join("\n")}\n} as const;`;

void describe("A TypeScript file anywhere in the repository, or a JavaScript file under `src/`, MUST NOT exceed 300 lines. The canonical `src/locales/index.ts` file MAY exceed 300 lines only when its sole declaration is the exported `locales` dictionary required by the Locales Rule.", () => {
  ruleTester.run("file-length", fileLengthRule, {
    valid: [
      {
        code: localeSourceWithLines(301),
        filename: srcFile("locales/index.ts"),
      },
      {
        code: sourceWithLines(300),
        filename: "/repo/src/features/example/example.ts",
      },
    ],
    invalid: [
      {
        code: sourceWithLines(301),
        filename: srcFile("locales/index.ts"),
        errors: [
          {
            message:
              "Source file has 301 lines; split it so no source file exceeds 300 lines. See docs/next-codebase-guide/rules/application-structure-rule.md",
          },
        ],
      },
      {
        code: `${localeSourceWithLines(301)}\nexport function format() { return "x"; }`,
        filename: srcFile("locales/index.ts"),
        errors: [
          {
            message:
              "Source file has 304 lines; split it so no source file exceeds 300 lines. See docs/next-codebase-guide/rules/application-structure-rule.md",
          },
        ],
      },
      {
        code: sourceWithLines(301),
        filename: "/repo/src/features/example/example.ts",
        errors: [
          {
            message:
              "Source file has 301 lines; split it so no source file exceeds 300 lines. See docs/next-codebase-guide/rules/application-structure-rule.md",
          },
        ],
      },
    ],
  });
});
