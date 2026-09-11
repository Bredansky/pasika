import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { routeHandlerDelegateTypesRule } from "./route-handler-delegate-types";

/**
 * Resolving a delegated call back to its defining file goes through the
 * project index, so it needs a real tree on disk: one delegate declares a
 * Result-typed return, one does not.
 */
const FIXTURE: Record<string, string> = {
  "utils/valid-delegate.ts":
    "export async function validDelegate(x: string): Promise<Result<string, HttpError>> {\n" +
    "  return { ok: true, value: x };\n}\n",
  "utils/invalid-delegate.ts": "export async function invalidDelegate(x: string): Promise<string> {\n  return x;\n}\n",
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-route-delegate-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const DOC = "See docs/next-codebase-guide/rules/route-handler-rule.md";
const invalidMessage = (handler: string, delegate: string): string =>
  `Handler "${handler}" delegates to "${delegate}", which does not declare its return type as Result. ${DOC}`;

void describe("A function a route handler delegates to MUST declare its return type as `Result`.", () => {
  ruleTester.run("route-handler-delegate-types", routeHandlerDelegateTypesRule, {
    valid: [
      // A single bare-awaited delegate that declares a Result return.
      {
        code: `import { validDelegate } from "@/utils/valid-delegate";
export const GET = async (request: NextRequest): Promise<NextResponse<{ status: string }>> => {
  const result = await validDelegate("x");
  return respond(result, (status) => ({ message: "OK.", data: status }));
};`,
        filename: srcFile("app/api/health/route.ts"),
      },
      // A delegate threaded through andThen that declares a Result return.
      {
        code: `import { validDelegate } from "@/utils/valid-delegate";
export async function POST(request: NextRequest): Promise<NextResponse<{ status: string }>> {
  const body = await request.json();
  const result = await andThen(ok(body), (orders) => validDelegate(orders));
  return respond(result, (status) => ({ message: "OK.", data: status }));
}`,
        filename: srcFile("app/api/render/route.ts"),
      },
      // A delegate this rule cannot resolve (no import for it at all) is
      // skipped rather than reported.
      {
        code: `export const GET = async (request: NextRequest): Promise<NextResponse<{ status: string }>> => {
  const result = await getStatusLocally();
  return respond(result, (status) => ({ message: "OK.", data: status }));
};`,
        filename: srcFile("app/api/health/route.ts"),
      },
      // A route.ts export that is not an HTTP method is not this rule's concern.
      {
        code: `import { invalidDelegate } from "@/utils/invalid-delegate";
export function helper() {
  return invalidDelegate("x");
}`,
        filename: srcFile("app/api/health/route.ts"),
      },
      // Code outside route.ts is not this rule's concern.
      {
        code: `import { invalidDelegate } from "@/utils/invalid-delegate";
export const GET = async () => {
  return invalidDelegate("x");
};`,
        filename: srcFile("utils/other.ts"),
      },
    ],
    invalid: [
      // A single bare-awaited delegate that does not declare a Result return.
      {
        code: `import { invalidDelegate } from "@/utils/invalid-delegate";
export const GET = async (request: NextRequest): Promise<NextResponse<{ status: string }>> => {
  const result = await invalidDelegate("x");
  return respond(result, (status) => ({ message: "OK.", data: status }));
};`,
        filename: srcFile("app/api/health/route.ts"),
        errors: [{ message: invalidMessage("GET", "invalidDelegate") }],
      },
      // A delegate threaded through andThen that does not declare a Result return.
      {
        code: `import { invalidDelegate } from "@/utils/invalid-delegate";
export async function POST(request: NextRequest): Promise<NextResponse<{ status: string }>> {
  const body = await request.json();
  const result = await andThen(ok(body), (orders) => invalidDelegate(orders));
  return respond(result, (status) => ({ message: "OK.", data: status }));
}`,
        filename: srcFile("app/api/render/route.ts"),
        errors: [{ message: invalidMessage("POST", "invalidDelegate") }],
      },
    ],
  });
});
