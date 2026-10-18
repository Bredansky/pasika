import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";
import { describe, ruleTester } from "../rule-tester";
import { routeHandlerShapeRule } from "./route-handler-shape";

const originalCwd = process.cwd();
const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-single-route-")));
const file = (relative: string): string => path.join(root, "src", relative);

const files: Record<string, string> = {
  "features/stream/utils/get-only.ts": "export async function getOnly() { return { status: 'ok' }; }",
  "features/stream/utils/get-shared.ts": "export async function getShared() { return { status: 'ok' }; }",
  "features/stream/utils/get-route-shared.ts": "export async function getRouteShared() { return { status: 'ok' }; }",
  "features/stream/utils/index.ts": 'export { getOnly } from "./get-only";',
  "features/stream/index.ts": 'export { getOnly } from "./utils";',
  "compositions/highlights.tsx":
    'import { getShared } from "../features/stream/utils/get-shared"; export function Highlights() { return getShared(); }',
  "app/api/second/route.ts":
    'import { getRouteShared } from "../../../features/stream/utils/get-route-shared"; export const GET = withResponse(contract, async () => ({data: await getRouteShared()}));',
  "app/api/main/route.ts": [
    'import { getOnly } from "../../../features/stream/index";',
    'import { getShared } from "../../../features/stream/utils/get-shared";',
    'import { getRouteShared } from "../../../features/stream/utils/get-route-shared";',
    "export const GET = withResponse(contract, async () => ({data: await getOnly()}));",
  ].join("\n"),
};

for (const [relative, contents] of Object.entries(files)) {
  const filename = file(relative);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, contents);
}
process.chdir(root);

const ROUTE = file("app/api/main/route.ts");
const SINGLE_USE =
  'Handler "GET" delegates its entire response to single-use utility "getOnly"; inline its workflow in route.ts. See docs/next-codebase-guide/rules/route-handler-rule.md';

void describe("A one-step `withResponse` handler MUST NOT delegate its entire response to a single-use imported utility.", () => {
  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  });

  ruleTester.run("route-handler-shape", routeHandlerShapeRule, {
    valid: [
      {
        filename: ROUTE,
        code: 'import { getShared } from "../../../features/stream/utils/get-shared"; export const GET = withResponse(contract, async () => ({ data: await getShared() }));',
      },
      {
        filename: ROUTE,
        code: 'import { getRouteShared } from "../../../features/stream/utils/get-route-shared"; export const GET = withResponse(contract, async () => ({ data: await getRouteShared() }));',
      },
      {
        filename: ROUTE,
        code: 'import { getOnly } from "../../../features/stream/utils/get-only"; export const GET = withResponse(contract, async () => { const id = await getId(); return { data: await getOnly(id) }; });',
      },
      {
        filename: ROUTE,
        code: "export const GET = withResponse(contract, async () => ({ data: await getStreamFromNpm() }));",
      },
      {
        filename: ROUTE,
        code: "export const GET = withResponse(contract, async () => ({ data: true }));",
      },
      {
        filename: ROUTE,
        code: 'import { getOnly } from "../../../features/stream/utils/get-only"; export const GET = withResponse(contract, async () => { await getOnly(); return { data: await getOnly() }; });',
      },
    ],
    invalid: [
      {
        filename: ROUTE,
        code: 'import { getOnly } from "../../../features/stream/utils"; export const GET = withResponse(contract, async () => ({ data: await getOnly() }));',
        errors: [{ message: SINGLE_USE }],
      },
      {
        filename: ROUTE,
        code: 'import { getOnly } from "../../../features/stream"; export const GET = withResponse(contract, async () => ({ data: await getOnly() }));',
        errors: [{ message: SINGLE_USE }],
      },
      {
        filename: ROUTE,
        code: 'import { getOnly } from "../../../features/stream/utils/get-only"; export const GET = withResponse(contract, async () => ({ data: await getOnly() }));',
        errors: [{ message: SINGLE_USE }],
      },
      {
        filename: ROUTE,
        code: 'import { getOnly } from "../../../features/stream/utils/get-only"; export const GET = withResponse(contract, async () => { return { data: await getOnly() }; });',
        errors: [{ message: SINGLE_USE }],
      },
      {
        filename: ROUTE,
        code: 'import { getOnly as fetchStatus } from "../../../features/stream/utils/get-only"; export const GET = withResponse(contract, async () => ({ data: await fetchStatus() }));',
        errors: [{ message: SINGLE_USE }],
      },
      {
        filename: ROUTE,
        code: 'import { getOnly } from "../../../features/stream/utils/get-only"; export const GET = withResponse(contract, async () => { const data = await getOnly(); return { data }; });',
        errors: [{ message: SINGLE_USE }],
      },
      {
        filename: ROUTE,
        code: 'import { getOnly } from "../../../features/stream/utils/get-only"; export const GET = withResponse(contract, async () => { const result = await getOnly(); return result; });',
        errors: [{ message: SINGLE_USE }],
      },
      {
        filename: ROUTE,
        code: 'import { getOnly } from "../../../features/stream/utils/get-only"; export const GET = withResponse(contract, async () => getOnly());',
        errors: [{ message: SINGLE_USE }],
      },
    ],
  });
});
