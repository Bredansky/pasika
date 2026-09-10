import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { schemaCasingRule } from "./schema-casing";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-schema-casing-")));
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);

const DOC = "See docs/next-codebase-guide/rules/types-and-schemas-rule.md";
const IMPORT = 'import { z } from "zod";\n';

void describe("A schema's name MUST be `camelCase`.", () => {
  ruleTester.run("schema-casing", schemaCasingRule, {
    valid: [
      // camelCase schema.
      { code: `${IMPORT}export const userSchema = z.object({});`, filename: file("schemas/index.ts") },
      // camelCase schema built through a chained call.
      { code: `${IMPORT}export const userSchema = z.object({}).extend({});`, filename: file("schemas/index.ts") },
      // Aliased zod import still resolves.
      {
        code: `import { z as zod } from "zod";\nexport const userSchema = zod.object({});`,
        filename: file("schemas/index.ts"),
      },
      // A constant not built from zod is out of this rule's scope.
      { code: `${IMPORT}export const MAX_RETRIES = 3;`, filename: file("schemas/index.ts") },
      // No zod import means nothing to check, regardless of casing.
      { code: "export const User = z.object({});", filename: file("schemas/index.ts") },
    ],
    invalid: [
      {
        code: `${IMPORT}export const User = z.object({});`,
        filename: file("schemas/index.ts"),
        errors: [{ message: `User must be camelCase. ${DOC}` }],
      },
      {
        code: `${IMPORT}export const ZUserSchema = z.object({});`,
        filename: file("schemas/index.ts"),
        errors: [{ message: `ZUserSchema must be camelCase. ${DOC}` }],
      },
    ],
  });
});
