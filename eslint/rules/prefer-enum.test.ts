import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { preferEnumRule } from "./prefer-enum";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-prefer-enum-")));
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";

void describe("A fixed set of named string or number values MUST be a TypeScript `enum` instead of an object literal marked `as const` or a named type alias made only of string/number literals.", () => {
  ruleTester.run("prefer-enum", preferEnumRule, {
    valid: [
      // Already an enum.
      {
        code: 'enum LanguageLabel { Ukrainian = "UA", Polish = "PL", English = "EN" }',
        filename: file("constants/index.ts"),
      },
      // `as const` on an array is a different, structurally valid pattern (e.g. feeding z.enum), not an enum candidate.
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
    ],
  });
});
