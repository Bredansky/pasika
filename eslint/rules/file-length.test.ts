import { describe, ruleTester } from "../rule-tester";
import { fileLengthRule } from "./file-length";

const sourceWithLines = (lineCount: number): string =>
  Array.from({ length: lineCount }, (_, index) => `export const value${String(index)} = ${String(index)};`).join("\n");

void describe("A source file MUST NOT exceed 300 lines.", () => {
  ruleTester.run("file-length", fileLengthRule, {
    valid: [
      {
        code: sourceWithLines(300),
        filename: "/repo/src/features/example/example.ts",
      },
    ],
    invalid: [
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
