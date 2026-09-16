import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { supportFolderShapeRule } from "./support-folder-shape";

function fixture(folder: string, index: string, sibling: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-support-shape-"));
  const directory = path.join(root, "src", "features", "billing", folder);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, "index.ts"), index);
  writeFileSync(path.join(directory, sibling), "export const value = 1;\n");
  return path.join(directory, "index.ts");
}

void describe("A constants/ folder MUST either define its constants directly in index.ts or group related constants in files that index.ts named-re-exports.", () => {
  const valid = fixture("constants", "export const value = 1;\n", "retry.ts");
  const grouped = fixture(
    "constants",
    'export { value } from "./retry";\nexport { timeout } from "./timeout";\n',
    "retry.ts",
  );
  writeFileSync(path.join(path.dirname(grouped), "timeout.ts"), "export const timeout = 1;\n");
  const singleReExport = fixture("constants", 'export { value } from "./retry";\n', "retry.ts");
  const singleWildcardReExport = fixture("constants", 'export * from "./retry";\n', "retry.ts");
  const invalid = fixture("constants", "\n", "retry.ts");
  const mixedAndNamed = fixture(
    "constants",
    'export const value = 1;\nexport { retryDelayMs } from "./retry";\n',
    "retry.ts",
  );
  const mixedAndWildcard = fixture("constants", 'export const value = 1;\nexport * from "./retry";\n', "retry.ts");
  ruleTester.run("support-folder-shape", supportFolderShapeRule, {
    valid: [
      { code: "export const value = 1;", filename: valid },
      { code: 'export { value } from "./retry";\nexport { timeout } from "./timeout";', filename: grouped },
    ],
    invalid: [
      { code: 'export { value } from "./retry";', filename: singleReExport, errors: 1 },
      { code: 'export * from "./retry";', filename: singleWildcardReExport, errors: 1 },
      { code: "", filename: invalid, errors: 1 },
      {
        code: 'export const value = 1;\nexport { retryDelayMs } from "./retry";',
        filename: mixedAndNamed,
        errors: 1,
      },
      {
        code: 'export const value = 1;\nexport * from "./retry";',
        filename: mixedAndWildcard,
        errors: 1,
      },
    ],
  });
});

void describe("A `types/` or `schemas/` folder with one support file MUST define its exports directly in `index.ts`; with several support files, it MUST group related types and schemas in files that `index.ts` named-re-exports.", () => {
  const direct = fixture("types", "export interface Invoice { id: string; }\n", "invoice.ts");
  const singleReExport = fixture("types", 'export { Invoice } from "./invoice";\n', "invoice.ts");
  const singleWildcardReExport = fixture("schemas", 'export * from "./invoice-schema";\n', "invoice-schema.ts");
  const invalid = fixture("schemas", "\n", "invoice-schema.ts");
  const mixedAndNamed = fixture(
    "types",
    'export type Value = number;\nexport { Invoice } from "./invoice";\n',
    "invoice.ts",
  );
  const mixedAndWildcard = fixture(
    "schemas",
    'export const value = 1;\nexport * from "./invoice-schema";\n',
    "invoice-schema.ts",
  );
  ruleTester.run("support-folder-shape", supportFolderShapeRule, {
    valid: [{ code: "export interface Invoice { id: string; }", filename: direct }],
    invalid: [
      { code: 'export { Invoice } from "./invoice";', filename: singleReExport, errors: 1 },
      { code: 'export * from "./invoice-schema";', filename: singleWildcardReExport, errors: 1 },
      { code: "", filename: invalid, errors: 1 },
      {
        code: 'export type Value = number;\nexport { Invoice } from "./invoice";',
        filename: mixedAndNamed,
        errors: 1,
      },
      {
        code: 'export const value = 1;\nexport * from "./invoice-schema";',
        filename: mixedAndWildcard,
        errors: 1,
      },
    ],
  });
});
