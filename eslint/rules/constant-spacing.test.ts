import { describe, ruleTester, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const MESSAGE =
  "Consecutive const declarations must not have blank lines between them. See docs/next-codebase-guide/rules/constants-rule.md";
const BOUNDARY_MESSAGE =
  "Different declaration groups must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const filename = srcFile("features/auth/select.tsx");

void describe("In source modules, consecutive named const declarations MUST have no blank line between them regardless of line wrapping, and different declaration groups MUST be separated by a blank line; comments MAY separate groups.", () => {
  ruleTester.run("constant-casing", constantCasingRule, {
    valid: [
      { code: "const first = 1;\nconst second = 2;", filename },
      { code: 'const badgeSecondaryClasses =\n  "long classes";\nconst badgeSlot = "badge";', filename },
      { code: "const first = {\n  value: 2,\n};\nconst second = 3;", filename },
      { code: "const first = 1;\nexport const second = 2;", filename },
      { code: "const first = 1;\n\n// Deliberate group\nconst second = 2;", filename },
      { code: "const first = 1;\n/* Deliberate group */\n\nconst second = 2;", filename },
      { code: "function run() {\n  const first = 1;\n\n  const second = 2;\n}", filename },
      { code: 'const selectTriggerSlot = "select-trigger";\n\nenum SelectTriggerSize { Small = "sm" }', filename },
      { code: 'enum SelectTriggerSize { Small = "sm" }\n\nconst selectTriggerSlot = "select-trigger";', filename },
      {
        code: 'const selectTriggerSlot = "select-trigger";\n// Size options\nenum SelectTriggerSize { Small = "sm" }',
        filename,
      },
      { code: "const first = 1, other = 2;\n\nconst second = 3;", filename },
      { code: "const { first } = config;\n\nconst second = 2;", filename },
      { code: "enum First { A = 1 }\nenum Second { B = 2 }", filename },
      { code: "interface First {}\ninterface Second {}", filename },
      { code: "function first() {}\n\nfunction second() {}", filename },
      { code: "const first = 1;\n\nconst second = 2;", filename: "scripts/build.ts" },
    ],
    invalid: [
      {
        code: "const first = 1;\n\nconst second = 2;",
        output: "const first = 1;\nconst second = 2;",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'const badgeSecondaryClasses =\n  "long classes";\n\nconst badgeSlot = "badge";',
        output: 'const badgeSecondaryClasses =\n  "long classes";\nconst badgeSlot = "badge";',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const first = 1;\n\nconst second = {\n  value: 2,\n};",
        output: "const first = 1;\nconst second = {\n  value: 2,\n};",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "export const first = getQuery(\n  key,\n);\n\nexport const second = getQuery(\n  key,\n);",
        output: "export const first = getQuery(\n  key,\n);\nexport const second = getQuery(\n  key,\n);",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const first = 1;\n\nexport const second = 2;",
        output: "const first = 1;\nexport const second = 2;",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const first = 1;\r\n\r\nexport const second = 2;",
        output: "const first = 1;\r\nexport const second = 2;",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const first = 1;\n\n\nconst second = 2;",
        output: "const first = 1;\nconst second = 2;",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const first = 1;\n  \n  const second = 2;",
        output: "const first = 1;\n  const second = 2;",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const first = 1;\nconst second = 2;\n\nconst third = 3;\n\nconst fourth = 4;",
        output: "const first = 1;\nconst second = 2;\nconst third = 3;\nconst fourth = 4;",
        filename,
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        code: 'const selectTriggerSlot = "select-trigger";\nenum SelectTriggerSize { Small = "sm" }',
        output: 'const selectTriggerSlot = "select-trigger";\n\nenum SelectTriggerSize { Small = "sm" }',
        filename,
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
      {
        code: 'export enum SelectTriggerSize { Small = "sm" }\r\nexport const selectTriggerSlot = "select-trigger";',
        output:
          'export enum SelectTriggerSize { Small = "sm" }\r\n\r\nexport const selectTriggerSlot = "select-trigger";',
        filename,
        errors: [{ message: BOUNDARY_MESSAGE }],
      },
      {
        code: "import type { X } from './x';\ntype Value = X;\nenum Kind { A = 1 }\nconst first = 1;\nfunction run() {}\nexport { run };",
        output:
          "import type { X } from './x';\n\ntype Value = X;\n\nenum Kind { A = 1 }\n\nconst first = 1;\n\nfunction run() {}\n\nexport { run };",
        filename,
        errors: [
          { message: BOUNDARY_MESSAGE },
          { message: BOUNDARY_MESSAGE },
          { message: BOUNDARY_MESSAGE },
          { message: BOUNDARY_MESSAGE },
          { message: BOUNDARY_MESSAGE },
        ],
      },
      {
        code: "const first = 1; const second = 2;",
        output: "const first = 1;\n const second = 2;",
        filename,
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
