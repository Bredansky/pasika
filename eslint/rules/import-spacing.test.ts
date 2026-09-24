import { describe, ruleTester, srcFile } from "../rule-tester";
import { importSpacingRule } from "./import-spacing";

const MESSAGE =
  "Consecutive import declarations must not be separated by a blank line. " +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

void describe("Consecutive import declarations MUST NOT be separated by a blank line.", () => {
  ruleTester.run("import-spacing", importSpacingRule, {
    valid: [
      {
        code: 'import { a } from "./a";\nimport { b } from "./b";\n\nexport { a, b };',
        filename: srcFile("utils/example.ts"),
      },
      {
        code: 'import { a } from "./a";\n// Explain the next import.\nimport { b } from "./b";',
        filename: srcFile("utils/example.ts"),
      },
      {
        code: 'import { a } from "./a";\n\nconst value = a;\n\nimport { b } from "./b";',
        filename: srcFile("utils/example.ts"),
      },
    ],
    invalid: [
      {
        code: 'import { a } from "./a";\n\nimport { b } from "./b";',
        output: 'import { a } from "./a";\nimport { b } from "./b";',
        filename: srcFile("utils/example.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'import { a } from "./a";\n// Explain the next import.\n\nimport { b } from "./b";',
        output: 'import { a } from "./a";\n// Explain the next import.\nimport { b } from "./b";',
        filename: srcFile("utils/example.ts"),
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
