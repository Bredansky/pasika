import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { requireBarrelStarExportsRule } from "./require-barrel-star-exports";

function fixture(folder: "constants" | "types" | "schemas", siblingName: string, siblingSource: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-barrel-star-"));
  const directory = path.join(root, "src", "features", "billing", folder);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, siblingName), siblingSource);
  return path.join(directory, "index.ts");
}

void describe("A `constants/`, `types/`, or `schemas/` `index.ts` MUST re-export a local sibling module only with `export * from` or `export type * from`; it MUST NOT use named re-exports to filter or rename that module's exports.", () => {
  const constantsBarrel = fixture(
    "constants",
    "colors.ts",
    'export const black = "#000";\nexport const white = "#fff";\n',
  );
  const typesBarrel = fixture(
    "types",
    "invoice.ts",
    "export interface Invoice { id: string }\nexport type InvoiceId = string;\n",
  );
  const schemasBarrel = fixture(
    "schemas",
    "invoice.ts",
    "export const invoiceSchema = {};\nexport const invoiceListSchema = [];\n",
  );
  const mixedModuleBarrel = fixture(
    "types",
    "mixed.ts",
    "export interface MixedType { id: string }\nexport const mixedValue = 1;\n",
  );
  const emptyModuleBarrel = fixture("constants", "empty.ts", "");

  ruleTester.run("require-barrel-star-exports", requireBarrelStarExportsRule, {
    valid: [
      { code: 'export * from "./colors";', filename: constantsBarrel },
      { code: 'export type * from "./invoice";', filename: typesBarrel },
      { code: 'export { value } from "@/shared/constants";', filename: constantsBarrel },
      {
        code: 'export { black, white } from "./colors";',
        filename: path.join(path.dirname(constantsBarrel), "not-index.ts"),
      },
      {
        code: 'export { black, white } from "./colors";',
        filename: path.join(path.dirname(path.dirname(constantsBarrel)), "utils", "index.ts"),
      },
      { code: "const local = 1; export { local };", filename: constantsBarrel },
      { code: 'export { black, white } from "./missing";', filename: constantsBarrel },
      { code: 'export { black, white } from "./nested/colors";', filename: constantsBarrel },
    ],
    invalid: [
      {
        code: 'export { black, white } from "./colors";',
        filename: constantsBarrel,
        output: 'export * from "./colors";',
        errors: [{ message: /MUST re-export a local sibling module with export \*/ }],
      },
      {
        code: 'export { black, white } from "./colors.ts";',
        filename: constantsBarrel,
        output: 'export * from "./colors.ts";',
        errors: [{ message: /MUST re-export a local sibling module with export \*/ }],
      },
      {
        code: 'export type { Invoice, InvoiceId } from "./invoice";',
        filename: typesBarrel,
        output: 'export type * from "./invoice";',
        errors: [{ message: /MUST re-export a local sibling module with export \*/ }],
      },
      {
        code: 'export { invoiceSchema, invoiceListSchema } from "./invoice";',
        filename: schemasBarrel,
        output: 'export * from "./invoice";',
        errors: [{ message: /MUST re-export a local sibling module with export \*/ }],
      },
      {
        code: 'export { black } from "./colors";',
        filename: constantsBarrel,
        output: null,
        errors: [{ message: /remove unwanted exports/ }],
      },
      {
        code: 'export { black as posterBlack, white } from "./colors";',
        filename: constantsBarrel,
        output: null,
        errors: [{ message: /rename declarations in the sibling module/ }],
      },
      {
        code: 'export { black as "poster-black", white } from "./colors";',
        filename: constantsBarrel,
        output: null,
        errors: [{ message: /rename declarations in the sibling module/ }],
      },
      {
        code: 'export type { MixedType } from "./mixed";',
        filename: mixedModuleBarrel,
        output: null,
        errors: [{ message: /MUST re-export a local sibling module with export \*/ }],
      },
      {
        code: 'export type { MixedType, mixedValue } from "./mixed";',
        filename: mixedModuleBarrel,
        output: null,
        errors: [{ message: /MUST re-export a local sibling module with export \*/ }],
      },
      {
        code: 'export { nothing } from "./empty";',
        filename: emptyModuleBarrel,
        output: null,
        errors: [{ message: /MUST re-export a local sibling module with export \*/ }],
      },
    ],
  });
});
