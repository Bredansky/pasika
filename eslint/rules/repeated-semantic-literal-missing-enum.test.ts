import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { repeatedSemanticLiteralRule } from "./repeated-semantic-literal";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-missing-route-enum-")));
process.chdir(root);
const file = (name: string, code: string): { filename: string; code: string } => {
  const filename = path.join(root, "src", name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
};
const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const shared = (value: string): string =>
  `The string literal ${value} repeats in 2 production files for the same semantic role. Extract a shared enum for this closed route domain at the consumers' CCF and import it. ${DOC}`;
const local = (value: string): string =>
  `The string literal ${value} repeats in the same semantic role in this file. Extract a file-local const. ${DOC}`;

file("features/news/a.ts", 'fetch("/api/alpha"); fetch("/api/beta");');
file("features/news/b.ts", 'fetch("/api/alpha"); fetch("/api/beta");');
file("features/news/local.ts", 'fetch("/api/local"); fetch("/api/local");');
file("features/news/ui.ts", 'const options = { variant: "default", label: "publish" };');
file("features/news/ui-other.ts", 'const options = { variant: "default", label: "publish" };');

void describe("A raw string or number MUST reuse a uniquely matching canonical constant or enum, or be extracted when the same meaningful semantic value recurs within or across production files; a single reusable value MUST use a `const` local to its file or at its consumers' CCF, while a known closed set of multiple related values MUST use an `enum`.", () => {
  ruleTester.run("repeated-semantic-literal: missing enum", repeatedSemanticLiteralRule, {
    valid: [file("features/news/ui.ts", 'const options = { variant: "default", label: "publish" };')],
    invalid: [
      {
        filename: path.join(root, "src/features/news/a.ts"),
        code: 'fetch("/api/alpha"); fetch("/api/beta");',
        errors: [{ message: shared('"/api/alpha"') }, { message: shared('"/api/beta"') }],
      },
      {
        filename: path.join(root, "src/features/news/b.ts"),
        code: 'fetch("/api/alpha"); fetch("/api/beta");',
        errors: [{ message: shared('"/api/alpha"') }, { message: shared('"/api/beta"') }],
      },
      {
        filename: path.join(root, "src/features/news/local.ts"),
        code: 'fetch("/api/local"); fetch("/api/local");',
        errors: [{ message: local('"/api/local"') }, { message: local('"/api/local"') }],
      },
    ],
  });
});
