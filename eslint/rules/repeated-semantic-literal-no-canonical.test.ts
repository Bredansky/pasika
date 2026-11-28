import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { repeatedSemanticLiteralRule } from "./repeated-semantic-literal";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-no-canonical-strings-")));
process.chdir(root);

function fixture(file: string, code: string): { filename: string; code: string } {
  const filename = path.join(root, "src", file);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
}

const one = fixture("features/first/blank.ts", 'const emptyText = ""; consume(emptyText);');
const two = fixture("features/second/blank.ts", 'const emptyText = ""; consume(emptyText);');
const message =
  'The named string "emptyText" repeats as "". Extract one shared const at the consumers\' CCF and import it across 2 source files. See docs/next-codebase-guide/rules/constants-rule.md';

void describe("Throughout src/, a string or numeric literal MUST reuse a uniquely matching existing constant or enum; repeated literals representing the same semantic value MUST share one canonical definition.", () => {
  ruleTester.run("repeated-semantic-literal", repeatedSemanticLiteralRule, {
    valid: [],
    invalid: [
      { ...one, errors: [{ message }] },
      { ...two, errors: [{ message }] },
    ],
  });
});
