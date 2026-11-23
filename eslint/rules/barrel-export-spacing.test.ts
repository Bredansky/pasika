import { describe, ruleTester, srcFile } from "../rule-tester";
import { barrelExportSpacingRule } from "./barrel-export-spacing";

const MESSAGE =
  "Consecutive star re-exports in an index barrel must not be separated by blank lines. " +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

void describe("Consecutive star re-export declarations in an `index.*` barrel MUST NOT be separated by blank lines.", () => {
  ruleTester.run("barrel-export-spacing", barrelExportSpacingRule, {
    valid: [
      { filename: srcFile("constants/index.ts"), code: 'export * from "./a";\nexport * from "./b";' },
      { filename: srcFile("constants/index.tsx"), code: 'export type * from "./types";\nexport * from "./runtime";' },
      { filename: srcFile("constants/index.mts"), code: 'export * from "./a";\nexport * from "./b";' },
      { filename: srcFile("constants/index.ts"), code: 'export * from "./a";\n// Group label\nexport * from "./b";' },
      {
        filename: srcFile("constants/index.ts"),
        code: 'export * from "./a";\n/* A documented section\n\n   with intentional comment spacing */\nexport * from "./b";',
      },
      {
        filename: srcFile("constants/index.ts"),
        code: 'export * from "./a";\nconst named = 1;\n\nexport * from "./b";',
      },
      { filename: srcFile("constants/example.ts"), code: 'export * from "./a";\n\nexport * from "./b";' },
      { filename: srcFile("constants/index.ts"), code: 'export * from "./a";\n\nexport { named } from "./named";' },
      { filename: srcFile("constants/index.ts"), code: 'export { named } from "./named";\n\nexport * from "./b";' },
      { filename: srcFile("constants/index.ts"), code: 'export const local = 1;\n\nexport * from "./b";' },
    ],
    invalid: [
      {
        filename: srcFile("constants/index.ts"),
        code: 'export * from "./a";\n\nexport * from "./b";',
        output: 'export * from "./a";\nexport * from "./b";',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("constants/index.ts"),
        code: 'export * from "./a";\n\n\nexport type * from "./types";',
        output: 'export * from "./a";\nexport type * from "./types";',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("constants/index.tsx"),
        code: 'export type * from "./types";\n\nexport * from "./runtime";',
        output: 'export type * from "./types";\nexport * from "./runtime";',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("constants/index.ts"),
        code: 'export * from "./a";\n\n// Keep this important comment\n\nexport * from "./b";',
        output: 'export * from "./a";\n// Keep this important comment\nexport * from "./b";',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("constants/index.ts"),
        code: 'export * from "./a";\n\n/* Documented\n\n   rationale */\n\nexport * from "./b";',
        output: 'export * from "./a";\n/* Documented\n\n   rationale */\nexport * from "./b";',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("constants/index.ts"),
        code: 'export * from "./a";\r\n\r\nexport * from "./b";',
        output: 'export * from "./a";\r\nexport * from "./b";',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("constants/index.ts"),
        code: 'export * from "./a";\n  \n  export * from "./b";',
        output: 'export * from "./a";\n  export * from "./b";',
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
