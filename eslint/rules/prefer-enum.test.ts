import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { preferEnumRule } from "./prefer-enum";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-prefer-enum-")));
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";

void describe("A fixed set of named string or number values MUST be a TypeScript `enum` instead of an object literal marked `as const`, a named type alias made only of string/number literals, a property declared as an inline string/number literal union, or a named `as const` array used as an enum domain through `z.enum` or `typeof values[number]`.", () => {
  ruleTester.run("prefer-enum", preferEnumRule, {
    valid: [
      // Already an enum.
      {
        code: 'enum LanguageLabel { Ukrainian = "UA", Polish = "PL", English = "EN" }',
        filename: file("constants/index.ts"),
      },
      // An unconsumed tuple is data, not a declaration of a named domain.
      { code: 'const draftFormats = ["post_45", "carousel"] as const;', filename: file("schemas/drafts.ts") },
      // A mixed-type object cannot become an enum.
      {
        code: "const config = { retries: 3, verbose: true } as const;",
        filename: file("config/index.ts"),
      },
      // A computed key cannot become an enum member name.
      {
        code: 'const labels = { [key]: "value" } as const;',
        filename: file("constants/index.ts"),
      },
      // A nested object value cannot become an enum member initializer.
      {
        code: 'const nested = { ua: { code: "UA" } } as const;',
        filename: file("constants/index.ts"),
      },
      // An empty object has no fixed set of values to convert.
      { code: "const empty = {} as const;", filename: file("constants/index.ts") },
      // A plain (non-const) type assertion is not this rule's concern.
      {
        code: 'const languageLabels = { ua: "UA" } as Record<string, string>;',
        filename: file("constants/index.ts"),
      },
      // A single literal is not a set of alternatives.
      {
        code: 'type OnlyStatus = "ready";',
        filename: file("types/status.ts"),
      },
      // Nullable/optional unions express absence as well as a value set.
      {
        code: 'type MaybeStatus = "ready" | "failed" | null;',
        filename: file("types/status.ts"),
      },
      {
        code: 'type OptionalStatus = "ready" | "failed" | undefined;',
        filename: file("types/status.ts"),
      },
      // References, booleans, and broad primitive types are not closed string/number literal sets.
      {
        code: 'type Status = "ready" | ExistingStatus;',
        filename: file("types/status.ts"),
      },
      {
        code: "type Toggle = true | false;",
        filename: file("types/toggle.ts"),
      },
      {
        code: "type StringOrNumber = string | number;",
        filename: file("types/status.ts"),
      },
      // Generic aliases describe a relationship, not a fixed enum.
      {
        code: 'type Result<T> = "ok" | T;',
        filename: file("types/result.ts"),
      },
      // Literal unions used as utility-type arguments select structure rather than declare a domain set.
      {
        code: 'type LayerBox = Pick<Position, "x" | "y" | "width" | "height">;',
        filename: file("types/layer.ts"),
      },
      // Nullable property unions model absence as part of the type.
      {
        code: 'interface Job { status: "ready" | "failed" | null }',
        filename: file("types/job.ts"),
      },
      // A property union containing a reference is not a closed literal set.
      {
        code: 'interface Job { status: "ready" | ExistingStatus }',
        filename: file("types/job.ts"),
      },
      // Runtime literals are values, not declarations of a reusable domain set.
      {
        code: 'const guide = { axis: "vertical", kind: "center" };',
        filename: file("utils/alignment.ts"),
      },
      // A standalone Zod literal is not a discriminated-union domain.
      {
        code: 'const textSchema = z.object({ type: z.literal("text") });',
        filename: file("schemas/layers.ts"),
      },
      // A normal Zod union does not establish a discriminator contract.
      {
        code: 'const textSchema = z.object({ type: z.literal("text") }); const mediaSchema = z.object({ type: z.literal("media") }); z.union([textSchema, mediaSchema]);',
        filename: file("schemas/layers.ts"),
      },
      // Only the selected discriminator property is governed.
      {
        code: 'enum LayerType { Text = "text", Media = "media" } const textSchema = z.object({ type: z.literal(LayerType.Text), mode: z.literal("compact") }); const mediaSchema = z.object({ type: z.literal(LayerType.Media), mode: z.literal("full") }); z.discriminatedUnion("type", [textSchema, mediaSchema]);',
        filename: file("schemas/layers.ts"),
      },
      // A schema without the selected discriminator is not an enum candidate.
      {
        code: 'const textSchema = z.object({ kind: z.literal("text") }); z.discriminatedUnion("type", [textSchema]);',
        filename: file("schemas/layers.ts"),
      },
      // An unresolved schema reference is outside this file-local analysis.
      {
        code: 'z.discriminatedUnion("type", [externalSchema]);',
        filename: file("schemas/layers.ts"),
      },
      // Computed object keys are not treated as discriminator declarations.
      {
        code: 'const key = "type"; const textSchema = z.object({ [key]: z.literal("text") }); z.discriminatedUnion("type", [textSchema]);',
        filename: file("schemas/layers.ts"),
      },
      // Non-string property keys are not discriminator names.
      {
        code: 'const textSchema = z.object({ 1: z.literal("text") }); z.discriminatedUnion("type", [textSchema]);',
        filename: file("schemas/layers.ts"),
      },
      // Calls that do not have the z.discriminatedUnion discriminator/options shape are ignored.
      {
        code: "z.discriminatedUnion(1, []);",
        filename: file("schemas/layers.ts"),
      },
    ],
    invalid: [
      {
        code: 'const languageLabels = { ua: "UA", pl: "PL", en: "EN" } as const;',
        filename: file("constants/index.ts"),
        errors: [
          {
            message: `A fixed set of named values must be a TypeScript enum, not an object literal marked as const. ${DOC}`,
          },
        ],
      },
      {
        code: "const httpStatusCodes = { ok: 200, notFound: 404 } as const;",
        filename: file("constants/index.ts"),
        errors: [
          {
            message: `A fixed set of named values must be a TypeScript enum, not an object literal marked as const. ${DOC}`,
          },
        ],
      },
      {
        code: 'export type AlignmentGuideId = "center-x" | "center-y" | "top" | "bottom" | "left" | "right";',
        filename: file("types/alignment-guide.ts"),
        errors: [
          {
            message: `A named union made only of string or number literals must be a TypeScript enum. ${DOC}`,
          },
        ],
      },
      {
        code: "type RetryCount = 1 | 2 | 3;",
        filename: file("types/retry.ts"),
        errors: [
          {
            message: `A named union made only of string or number literals must be a TypeScript enum. ${DOC}`,
          },
        ],
      },
      {
        code: 'type ResultCode = "ok" | 500;',
        filename: file("types/result.ts"),
        errors: [
          {
            message: `A named union made only of string or number literals must be a TypeScript enum. ${DOC}`,
          },
        ],
      },
      {
        code: 'interface AlignmentGuide { axis: "horizontal" | "vertical"; kind: "center" | "edge" }',
        filename: file("types/alignment-guide.ts"),
        errors: [
          {
            message: `A property whose type is a union made only of string or number literals must use a TypeScript enum. ${DOC}`,
          },
          {
            message: `A property whose type is a union made only of string or number literals must use a TypeScript enum. ${DOC}`,
          },
        ],
      },
      {
        code: 'type AlignmentGuide = { axis: "horizontal" | "vertical" };',
        filename: file("types/alignment-guide.ts"),
        errors: [
          {
            message: `A property whose type is a union made only of string or number literals must use a TypeScript enum. ${DOC}`,
          },
        ],
      },
      {
        code: "interface RetryPolicy { retries: 1 | 2 | 3 }",
        filename: file("types/retry.ts"),
        errors: [
          {
            message: `A property whose type is a union made only of string or number literals must use a TypeScript enum. ${DOC}`,
          },
        ],
      },
      {
        code: 'const textSchema = z.object({ type: z.literal("text") }); const mediaSchema = z.object({ type: z.literal("media") }); z.discriminatedUnion("type", [textSchema, mediaSchema]);',
        filename: file("schemas/layers.ts"),
        errors: [
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
        ],
      },
      {
        code: 'z.discriminatedUnion("type", [z.object({ type: z.literal("text") }), z.object({ type: z.literal("media") })]);',
        filename: file("schemas/layers.ts"),
        errors: [
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
        ],
      },
      {
        code: 'const textSchema = z.object({ "type": z.literal("text") }); const mediaSchema = z.object({ "type": z.literal("media") }); z.discriminatedUnion("type", [textSchema, mediaSchema]);',
        filename: file("schemas/layers.ts"),
        errors: [
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
        ],
      },
      {
        code: 'z.discriminatedUnion("code", [z.object({ code: z.literal(1) }), z.object({ code: z.literal(2) })]);',
        filename: file("schemas/result.ts"),
        errors: [
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
        ],
      },
      {
        code: 'z.discriminatedUnion("type", [lateTextSchema, lateMediaSchema]); const lateTextSchema = z.object({ type: z.literal("text") }); const lateMediaSchema = z.object({ type: z.literal("media") });',
        filename: file("schemas/layers.ts"),
        errors: [
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
          {
            message: `A Zod discriminated-union discriminator literal must use a TypeScript enum member. ${DOC}`,
          },
        ],
      },
    ],
  });
});
