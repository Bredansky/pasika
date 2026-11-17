import { describe, ruleTester, srcFile } from "../rule-tester";
import { importSpacingRule } from "./import-spacing";

const MESSAGE =
  "Consecutive ordinary import declarations must not be separated by a blank line. " +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";
const SERVER_ONLY_MESSAGE =
  'Leave a blank line after import "server-only"; before other imports. ' +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

void describe('Consecutive import declarations MUST NOT be separated by a blank line unless the preceding import is `import "server-only";`.', () => {
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

void describe("A `server-only` marker MUST be separated from the next import declaration by a blank line.", () => {
  ruleTester.run("import-spacing", importSpacingRule, {
    valid: [
      {
        code: 'import "server-only";\n\nimport { a } from "./a";\nimport { b } from "./b";',
        filename: srcFile("utils/example.ts"),
      },
      {
        code: 'import "server-only";\n\n// Explanation.\nimport { a } from "./a";',
        filename: srcFile("utils/example.ts"),
      },
      {
        code: 'import "server-only";\n\nexport const value = 1;',
        filename: srcFile("utils/example.ts"),
      },
      {
        code: 'import "server-only";',
        filename: srcFile("utils/example.ts"),
      },
    ],
    invalid: [
      {
        code: 'import "server-only";\nimport { a } from "./a";\nimport { b } from "./b";',
        output: 'import "server-only";\n\nimport { a } from "./a";\nimport { b } from "./b";',
        filename: srcFile("utils/example.ts"),
        errors: [{ message: SERVER_ONLY_MESSAGE }],
      },
      {
        code: 'import "server-only";\r\nimport type { A } from "./types";',
        output: 'import "server-only";\r\n\r\nimport type { A } from "./types";',
        filename: srcFile("utils/example.ts"),
        errors: [{ message: SERVER_ONLY_MESSAGE }],
      },
      {
        code: 'import "server-only";\n// Explanation.\nimport { a } from "./a";',
        output: 'import "server-only";\n// Explanation.\n\nimport { a } from "./a";',
        filename: srcFile("utils/example.ts"),
        errors: [{ message: SERVER_ONLY_MESSAGE }],
      },
    ],
  });
});
