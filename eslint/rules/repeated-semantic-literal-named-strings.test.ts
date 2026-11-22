import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { repeatedSemanticLiteralRule } from "./repeated-semantic-literal";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-repeated-named-strings-")));
process.chdir(root);

function file(relative: string, code: string): { filename: string; code: string } {
  const filename = path.join(root, "src", relative);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
}

const doc = "See docs/next-codebase-guide/rules/constants-rule.md";
const shared = (name: string, value: string, files: number): string =>
  `The named string ${JSON.stringify(name)} repeats as ${JSON.stringify(value)}. Extract one shared const at the consumers' CCF and import it across ${String(files)} production files. ${doc}`;
const local = (name: string, value: string): string =>
  `The named string ${JSON.stringify(name)} repeats as ${JSON.stringify(value)}. Declare one file-local const in an enclosing scope and reuse it. ${doc}`;

const first = file("features/home/empty-text.ts", 'const emptyText = ""; use(emptyText);');
const second = file("features/editor/empty-text.ts", 'const emptyText = ""; use(emptyText);');
const shortA = file("features/editor/short-a.ts", 'const tinyModeMarker = "x"; use(tinyModeMarker);');
const shortB = file("features/editor/short-b.ts", 'const tinyModeMarker = "x"; use(tinyModeMarker);');
const localDuplicates = file(
  "features/home/local-blanks.ts",
  'function a() { const localBlank = ""; use(localBlank); }\nfunction b() { const localBlank = ""; use(localBlank); }',
);
const wrappedA = file("features/home/wrapped-a.ts", 'const sharedBlank = "" as const; use(sharedBlank);');
const wrappedB = file("features/editor/wrapped-b.ts", "const sharedBlank = ``; use(sharedBlank);");
const tsxA = file(
  "features/home/card.tsx",
  'const emptyCardLabel = ""; export function Card() { return <span>{emptyCardLabel}</span>; }',
);
const tsxB = file(
  "features/editor/card.tsx",
  'const emptyCardLabel = ""; export function Card() { return <span>{emptyCardLabel}</span>; }',
);
const semanticA = file("features/editor/semantic-a.ts", 'const eventName = "draft:created"; use(eventName);');
const semanticB = file("features/editor/semantic-b.ts", 'const eventName = "draft:created"; use(eventName);');
const canonical = file("constants/text.ts", 'export const canonicalBlank = "";');
const redundantCanonical = file("features/home/redundant-blank.ts", 'const canonicalBlank = ""; use(canonicalBlank);');
const unrelatedA = file("features/home/unrelated-a.ts", 'const emptyPrompt = ""; use(emptyPrompt);');
const unrelatedB = file("features/editor/unrelated-b.ts", 'const emptyCaption = ""; use(emptyCaption);');
const genericA = file("features/home/generic-a.ts", 'const value = ""; use(value);');
const genericB = file("features/editor/generic-b.ts", 'const value = ""; use(value);');
const differentA = file("features/home/different-a.ts", 'const uniqueIndicator = "x"; use(uniqueIndicator);');
const differentB = file("features/editor/different-b.ts", 'const uniqueIndicator = "y"; use(uniqueIndicator);');
const mutable = file("features/editor/mutable.ts", 'let emptyText = ""; use(emptyText);');
const fixture = file("features/home/example.test.ts", 'const emptyText = ""; use(emptyText);');

void describe("A string or numeric literal MUST reuse a uniquely matching existing constant or enum; repeated literals representing the same semantic value MUST share one canonical definition.", () => {
  ruleTester.run("repeated-semantic-literal", repeatedSemanticLiteralRule, {
    valid: [canonical, unrelatedA, unrelatedB, genericA, genericB, differentA, differentB, mutable, fixture],
    invalid: [
      { ...first, errors: [{ message: shared("emptyText", "", 2) }] },
      { ...second, errors: [{ message: shared("emptyText", "", 2) }] },
      { ...shortA, errors: [{ message: shared("tinyModeMarker", "x", 2) }] },
      { ...shortB, errors: [{ message: shared("tinyModeMarker", "x", 2) }] },
      {
        ...localDuplicates,
        errors: [{ message: local("localBlank", "") }, { message: local("localBlank", "") }],
      },
      { ...wrappedA, errors: [{ message: shared("sharedBlank", "", 2) }] },
      { ...wrappedB, errors: [{ message: shared("sharedBlank", "", 2) }] },
      { ...tsxA, errors: [{ message: shared("emptyCardLabel", "", 2) }] },
      { ...tsxB, errors: [{ message: shared("emptyCardLabel", "", 2) }] },
      {
        ...semanticA,
        errors: [
          {
            message: `The string literal "draft:created" repeats in 2 production files for the same semantic role. Extract one shared const at the consumers' CCF and import it. ${doc}`,
          },
        ],
      },
      {
        ...semanticB,
        errors: [
          {
            message: `The string literal "draft:created" repeats in 2 production files for the same semantic role. Extract one shared const at the consumers' CCF and import it. ${doc}`,
          },
        ],
      },
      {
        ...redundantCanonical,
        errors: [{ message: `Reuse canonicalBlank from src/constants/text.ts instead of redefining "". ${doc}` }],
      },
    ],
  });
});
