import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-constant-casing-")));
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";

void describe("A constant's name MUST be `camelCase`, unless its value is a direct `process.env` read (with or without a fallback), in which case it MAY use `SCREAMING_SNAKE_CASE` instead, or a framework requires a specific name for it (for example, a Next.js route handler exported as `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, or `OPTIONS`). A constant computed or derived from one or more environment variables — a fallback chain, a parsed number, a template string — is not a direct read and MUST still be `camelCase`.", () => {
  ruleTester.run("constant-casing", constantCasingRule, {
    valid: [
      // camelCase constant.
      { code: "export const maxFileSize = 20 * 1024 * 1024;", filename: file("constants/index.ts") },
      // Direct process.env read, no fallback.
      { code: "const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;", filename: file("app/api/post/route.ts") },
      // Direct process.env read with a `??` fallback.
      { code: 'const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";', filename: file("app/api/post/route.ts") },
      // Direct process.env read with a ternary fallback.
      {
        code: 'const NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV : "development";',
        filename: file("config/mode/index.ts"),
      },
      // PascalCase (types/enums) is a different rule's concern; this rule only matches SCREAMING_SNAKE_CASE.
      { code: "export const HomeFeedConfig = 1;", filename: file("constants/index.ts") },
      // A non-module-level (block-scoped) constant is out of this rule's scope.
      { code: "function run() { const RETRY_COUNT = 3; return RETRY_COUNT; }", filename: file("utils/run.ts") },
      // Next.js route handlers must be exported under these exact names.
      { code: "export const GET = async () => new Response();", filename: file("app/api/post/route.ts") },
      { code: "export const POST = handler;", filename: file("app/api/post/route.ts") },
    ],
    invalid: [
      {
        code: "export const MAX_FILE_SIZE = 20 * 1024 * 1024;",
        filename: file("constants/index.ts"),
        errors: [
          {
            message: `MAX_FILE_SIZE must be camelCase; only a direct process.env read may use SCREAMING_SNAKE_CASE. ${DOC}`,
          },
        ],
      },
      {
        // Only the specific Next.js route-handler names are exempt from casing.
        code: "export const HANDLER = async () => new Response();",
        filename: file("app/api/post/route.ts"),
        errors: [
          {
            message: `HANDLER must be camelCase; only a direct process.env read may use SCREAMING_SNAKE_CASE. ${DOC}`,
          },
        ],
      },
      {
        // A fallback chain derived from process.env, but not a direct read, must still be camelCase.
        code: 'const envValue = process.env.APP_URL;\nexport const APP_URL = envValue ?? "http://localhost:3000";',
        filename: file("config/app-url/index.ts"),
        errors: [
          {
            message: `APP_URL must be camelCase; only a direct process.env read may use SCREAMING_SNAKE_CASE. ${DOC}`,
          },
        ],
      },
    ],
  });
});
