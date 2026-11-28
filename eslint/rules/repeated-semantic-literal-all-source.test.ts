import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { repeatedSemanticLiteralRule } from "./repeated-semantic-literal";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-all-source-literals-")));
process.chdir(root);

function file(relative: string, code: string): { filename: string; code: string } {
  const filename = path.join(root, relative);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
}

const canonical = file("src/constants/text-format.ts", 'export const emptyText = "";');
const duplicates = [
  "src/features/mocks/utils/ai-text-edit-mock.ts",
  "src/features/editor/editor.test.ts",
  "src/features/editor/editor.spec.tsx",
  "src/features/editor/editor.mock.ts",
  "src/features/editor/__tests__/fixture.ts",
  "src/features/editor/__mocks__/fixture.ts",
  "src/features/editor/fixtures/text.ts",
].map((relative) => file(relative, 'const emptyText = ""; use(emptyText);'));
const reused = file(
  "src/features/mocks/utils/reused.ts",
  'import { emptyText } from "../../../constants/text-format"; use(emptyText);',
);
const outside = file("tests/outside.test.ts", 'const emptyText = ""; use(emptyText);');

void describe("Throughout src/, including mocks, tests, and fixtures, a string or numeric literal MUST reuse a uniquely matching existing constant or enum; repeated literals representing the same semantic value MUST share one canonical definition.", () => {
  ruleTester.run("repeated-semantic-literal: all source files", repeatedSemanticLiteralRule, {
    valid: [canonical, reused, outside],
    invalid: duplicates.map((entry) => ({
      ...entry,
      errors: [
        {
          message:
            'Reuse emptyText from src/constants/text-format.ts instead of redefining "". See docs/next-codebase-guide/rules/constants-rule.md',
        },
      ],
    })),
  });
});
