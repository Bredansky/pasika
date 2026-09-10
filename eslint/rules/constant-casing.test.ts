import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-constant-casing-")));
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";

void describe("A constant's name MUST be `camelCase`, unless a framework requires a specific name for it (for example, a Next.js route handler exported as `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, or `OPTIONS`).", () => {
  ruleTester.run("constant-casing", constantCasingRule, {
    valid: [
      // camelCase constant.
      { code: "export const maxFileSize = 20 * 1024 * 1024;", filename: file("constants/index.ts") },
      // camelCase constant reading a process.env variable.
      { code: 'const webhookSecret = process.env.WEBHOOK_SECRET ?? "";', filename: file("app/api/post/route.ts") },
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
            message: `MAX_FILE_SIZE must be camelCase, unless a framework requires this exact name. ${DOC}`,
          },
        ],
      },
      {
        // Screaming-case env-derived constants are no longer exempt; only framework-required names are.
        code: 'const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";',
        filename: file("app/api/post/route.ts"),
        errors: [
          {
            message: `WEBHOOK_SECRET must be camelCase, unless a framework requires this exact name. ${DOC}`,
          },
        ],
      },
      {
        // Only the specific Next.js route-handler names are exempt from casing.
        code: "export const HANDLER = async () => new Response();",
        filename: file("app/api/post/route.ts"),
        errors: [
          {
            message: `HANDLER must be camelCase, unless a framework requires this exact name. ${DOC}`,
          },
        ],
      },
    ],
  });
});
