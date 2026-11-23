import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import tsParser from "@typescript-eslint/parser";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import { CwdAwareRuleTester, describe } from "../rule-tester";
import { preferEnumRule } from "./prefer-enum";
import { semanticZodEnumMembers } from "./prefer-enum-zod";

vi.setConfig({ testTimeout: 40_000 });

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-zod-enum-semantics-")));
const srcRoot = path.join(root, "src");
process.chdir(root);

function source(relativePath: string, content: string): string {
  const filename = path.join(srcRoot, relativePath);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, content);
  return filename;
}

const telegram = [
  'export const telegramInputMediaPhotoKind = "photo";',
  'export const telegramInputMediaDocumentKind = "document";',
  'export const telegramInputMediaAudioKind = "audio";',
  'export const telegramInputMediaVideoKind = "video";',
  'export const telegramProxyFileIdQueryKey = "file_id";',
].join("\n");

const telegramFile = source("constants/telegram.ts", telegram);
source("constants/index.ts", 'export * from "./telegram";');
const schema = [
  'import { z } from "zod";',
  'import { telegramInputMediaPhotoKind, telegramInputMediaVideoKind, telegramInputMediaDocumentKind, telegramInputMediaAudioKind } from "../constants";',
  "export const inputMediaSchema = z.enum([",
  "  telegramInputMediaPhotoKind, telegramInputMediaVideoKind,",
  "  telegramInputMediaDocumentKind, telegramInputMediaAudioKind,",
  "]);",
].join("\n");
source("schemas/telegram-api-payload.ts", schema);

// A semantic domain can be inferred across files without relying on names.
const arbitrary = source(
  "constants/unrelated.ts",
  [
    'export const alpha = "left";',
    'export const beta = "right";',
    'export const unmatched = "unmatched";',
    'export const sameA = "same";',
    'export const sameB = "same";',
    'export const partialA = "partial";',
    "export const untypedA = 3;",
    "export const untypedB = 5;",
    'export const shadowed = "original";',
  ].join("\n"),
);
source(
  "schemas/other.ts",
  [
    'import { z as schema } from "zod";',
    'import { alpha as first, beta as second, sameA, sameB, partialA, untypedA, untypedB, shadowed } from "../constants/unrelated";',
    "export const options = schema.enum([first, second]);",
    "export const duplicate = schema.enum([sameA, sameB]);",
    "export const notFullyResolved = schema.enum([partialA, missing]);",
    "export const nonStrings = schema.enum([untypedA, untypedB]);",
    "export const noImports = unrelated.enum([sameA, sameB]);",
    "export const plainData = [first, second];",
    'export function local() { const shadowed = "inner"; return schema.enum([shadowed, second]); }',
  ].join("\n"),
);

const diagnostic =
  "Constants used as alternatives in a Zod enum must be members of one TypeScript enum. " +
  "See docs/next-codebase-guide/rules/constants-rule.md";

void describe("Semantically detect closed Zod enum sets without relying on constant names.", () => {
  it("finds Telegram media alternatives and aliased imports without flagging partial or unrelated sets", () => {
    const program = ts.createProgram(
      [
        telegramFile,
        arbitrary,
        path.join(srcRoot, "schemas/telegram-api-payload.ts"),
        path.join(srcRoot, "schemas/other.ts"),
      ],
      { noEmit: true, moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext },
    );
    const members = semanticZodEnumMembers(program, srcRoot);
    for (const name of [
      "telegramInputMediaPhotoKind",
      "telegramInputMediaVideoKind",
      "telegramInputMediaDocumentKind",
      "telegramInputMediaAudioKind",
    ]) {
      expect(members.has(`${telegramFile}:${name}`)).toBe(true);
    }
    for (const name of ["alpha", "beta"]) {
      expect(members.has(`${arbitrary}:${name}`)).toBe(true);
    }
    for (const name of [
      "telegramProxyFileIdQueryKey",
      "unmatched",
      "sameA",
      "sameB",
      "partialA",
      "untypedA",
      "untypedB",
      "shadowed",
    ]) {
      const filename = name.startsWith("telegram") ? telegramFile : arbitrary;
      expect(members.has(`${filename}:${name}`)).toBe(false);
    }
  });

  writeFileSync(
    path.join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        noEmit: true,
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
      },
      include: ["src/**/*.ts"],
    }),
  );

  const typedRuleTester = new CwdAwareRuleTester({
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { projectService: true, tsconfigRootDir: root },
    },
  });

  typedRuleTester.run("prefer-enum: imported constants in a Zod closed set", preferEnumRule, {
    valid: [
      { filename: path.join(srcRoot, "schemas/telegram-api-payload.ts"), code: schema },
      { filename: path.join(srcRoot, "constants/index.ts"), code: 'export * from "./telegram";' },
    ],
    invalid: [
      {
        filename: telegramFile,
        code: telegram,
        errors: Array.from({ length: 4 }, () => ({ message: diagnostic })),
      },
    ],
  });
});
