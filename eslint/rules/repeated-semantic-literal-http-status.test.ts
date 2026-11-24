import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { repeatedSemanticLiteralRule } from "./repeated-semantic-literal";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-http-status-enum-")));
process.chdir(root);

const file = (name: string, code: string): { filename: string; code: string } => {
  const filename = path.join(root, "src", name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
};

const enumFile = "constants/http.ts";
file(
  enumFile,
  "export enum HttpStatusCodeEnum { Ok = 200, Created = 201, Unauthorized = 401, InternalServerError = 500 }",
);
file("features/auth/constants/index.ts", "export const forbiddenOperationStatusCode = 403;");
file("features/editor/constants/index.ts", "export const createdStatusCode = 201;");
file("features/render/constants/index.ts", "export const canvasWidth = 403;");
file("features/editor/status.ts", "export const processingStatusCode = 42;");
file(
  "features/api/status.ts",
  'import { HttpStatusCodeEnum } from "../../constants/http"; export const status = HttpStatusCodeEnum.Ok;',
);

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";

void describe("A string or numeric literal MUST reuse a uniquely matching existing constant or enum; repeated literals representing the same semantic value MUST share one canonical definition.", () => {
  ruleTester.run("repeated-semantic-literal: HTTP status enum", repeatedSemanticLiteralRule, {
    valid: [
      file("features/render/constants/index.ts", "export const canvasWidth = 403;"),
      file("features/editor/status.ts", "export const processingStatusCode = 42;"),
      file(
        "features/api/status.ts",
        'import { HttpStatusCodeEnum } from "../../constants/http"; export const status = HttpStatusCodeEnum.Ok;',
      ),
      file("features/editor/unrelated.ts", "export const retryCount = 403;"),
    ],
    invalid: [
      {
        code: "export const forbiddenOperationStatusCode = 403;",
        filename: path.join(root, "src/features/auth/constants/index.ts"),
        errors: [
          {
            message: `Add HTTP status 403 to existing HttpStatusCodeEnum in src/${enumFile} and reuse that member instead of a standalone constant. ${DOC}`,
          },
        ],
      },
      {
        code: "export const createdStatusCode = 201;",
        filename: path.join(root, "src/features/editor/constants/index.ts"),
        errors: [
          {
            message: `Reuse HttpStatusCodeEnum.Created from src/${enumFile} instead of redefining 201. ${DOC}`,
          },
        ],
      },
    ],
  });
});
