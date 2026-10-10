import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import tsParser from "@typescript-eslint/parser";
import { CwdAwareRuleTester, describe, ruleTester } from "../rule-tester";
import { preferEnumRule } from "./prefer-enum";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-prefer-enum-tuples-")));
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const diagnostic =
  "A const tuple used as a named enum domain must be replaced with a TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md";

void describe("A named `as const` array of distinct string or number literals used by `z.enum` or as a `typeof values[number]` domain MUST be replaced with a TypeScript `enum`.", () => {
  ruleTester.run("prefer-enum: const tuple domain uses", preferEnumRule, {
    valid: [
      {
        code: 'const ordering = ["latest", "oldest"] as const; ordering.map((x) => x);',
        filename: file("utils/order.ts"),
      },
      { code: "const coordinates = [4, 12] as const;", filename: file("utils/coordinates.ts") },
      { code: 'const options = ["small", "large"] as const; buildSelect(options);', filename: file("ui/options.ts") },
      { code: 'const mixed = ["ready", false] as const; z.enum(mixed);', filename: file("schemas/mixed.ts") },
      { code: 'const singleton = ["only"] as const; z.enum(singleton);', filename: file("schemas/single.ts") },
      {
        code: 'enum Status { Pending = "pending", Stored = "stored" } z.enum(Status);',
        filename: file("schemas/status.ts"),
      },
      { code: 'z.enum(["pending", "stored"]);', filename: file("schemas/inline.ts") },
      {
        code: 'type First = (typeof ordering)[0]; const ordering = ["first", "second"] as const;',
        filename: file("types/first.ts"),
      },
      {
        code: 'const statuses = ["pending", "stored"] as const; unrelated(statuses);',
        filename: file("utils/other.ts"),
      },
    ],
    invalid: [
      {
        code: 'const statuses = ["pending", "stored", "failed"] as const; z.enum(statuses);',
        filename: file("schemas/statuses.ts"),
        errors: [{ message: diagnostic }],
      },
      {
        code: 'z.enum(statuses); const statuses = ["pending", "stored"] as const;',
        filename: file("schemas/statuses-later.ts"),
        errors: [{ message: diagnostic }],
      },
      {
        code: "const retryCounts = [1, 2, 3] as const; type RetryCount = (typeof retryCounts)[number];",
        filename: file("types/retries.ts"),
        errors: [{ message: diagnostic }],
      },
      {
        code: 'export const mediaKinds = ["image", "video"] as const; export type Kind = (typeof mediaKinds)[number];',
        filename: file("types/media.ts"),
        errors: [{ message: diagnostic }],
      },
      {
        code: 'const statuses = ["pending", "stored"] as const; z.enum(statuses); type Status = (typeof statuses)[number];',
        filename: file("schemas/both.ts"),
        errors: [{ message: diagnostic }],
      },
    ],
  });

  // An imported tuple, including one re-exported through a constants barrel,
  // is the real-world M02 pattern. Typed parser services resolve that symbol.
  mkdirSync(path.join(root, "src", "constants"), { recursive: true });
  mkdirSync(path.join(root, "src", "schemas"), { recursive: true });
  mkdirSync(path.join(root, "src", "types"), { recursive: true });
  writeFileSync(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: { noEmit: true, strict: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler" },
      include: ["src/**/*.ts"],
    }),
  );
  writeFileSync(
    file("constants/media-statuses.ts"),
    'export const mediaStatuses = ["pending", "stored", "too_large"] as const;',
  );
  writeFileSync(file("constants/index.ts"), 'export { mediaStatuses } from "./media-statuses";');

  const importSchema = 'import { mediaStatuses } from "../constants"; const schema = z.enum(mediaStatuses);';
  const importAliasedSchema =
    'import { mediaStatuses as statuses } from "../constants"; const schema = z.enum(statuses);';
  const importedType =
    'import { mediaStatuses } from "../constants"; export type Status = (typeof mediaStatuses)[number];';
  const harmlessImport = 'import { mediaStatuses } from "../constants"; mediaStatuses.map((status) => status);';
  writeFileSync(file("schemas/imported.ts"), importSchema);
  writeFileSync(file("schemas/aliased.ts"), importAliasedSchema);
  writeFileSync(file("types/imported.ts"), importedType);
  writeFileSync(file("schemas/harmless.ts"), harmlessImport);

  const typedTester = new CwdAwareRuleTester({
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { projectService: true },
    },
  });

  typedTester.run("prefer-enum: imported domain tuples", preferEnumRule, {
    valid: [{ code: harmlessImport, filename: file("schemas/harmless.ts") }],
    invalid: [
      { code: importSchema, filename: file("schemas/imported.ts"), errors: [{ message: diagnostic }] },
      { code: importAliasedSchema, filename: file("schemas/aliased.ts"), errors: [{ message: diagnostic }] },
      { code: importedType, filename: file("types/imported.ts"), errors: [{ message: diagnostic }] },
    ],
  });
});
