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
  const reExported = fixture("constants", 'export { value } from "./retry";\n', "retry.ts");
  const wildcardReExported = fixture("constants", 'export * from "./retry";\n', "retry.ts");
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
      { code: 'export { value } from "./retry";', filename: reExported },
      { code: 'export * from "./retry";', filename: wildcardReExported },
    ],
    invalid: [
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

void describe("A types/ or schemas/ folder MUST either define its exports directly in index.ts or group related types and schemas in files that index.ts named-re-exports.", () => {
  const valid = fixture("types", 'export { Invoice } from "./invoice";\n', "invoice.ts");
  const wildcardValid = fixture("schemas", 'export * from "./invoice-schema";\n', "invoice-schema.ts");
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
    valid: [
      { code: 'export { Invoice } from "./invoice";', filename: valid },
      { code: 'export * from "./invoice-schema";', filename: wildcardValid },
    ],
    invalid: [
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
