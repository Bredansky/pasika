import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { repeatedSemanticLiteralRule } from "./repeated-semantic-literal";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-semantic-literals-")));
process.chdir(root);
const file = (name: string, code: string): { filename: string; code: string } => {
  const filename = path.join(root, "src", name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
};

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const reused = (name: string, value: string, source: string): string =>
  `Reuse ${name} from src/${source} instead of raw ${value}. ${DOC}`;
const across = (kind: string, value: string, count: number, variant: string): string =>
  `The ${kind} literal ${value} repeats in ${String(count)} production files for the same semantic role. Extract ${variant} at the consumers' CCF and import it. ${DOC}`;
const addRoute = (value: string): string =>
  `The route ${value} repeats; add a member to existing ApiRoute in src/constants/routes.ts and reuse it. ${DOC}`;
const local = (kind: string, value: string): string =>
  `The ${kind} literal ${value} repeats in the same semantic role in this file. Extract a file-local const. ${DOC}`;

const newRoute = (value: string): string =>
  `The route ${value} belongs to existing ApiRoute; add a member in src/constants/routes.ts and reuse it. ${DOC}`;
const closedDomain = (value: string, count: number, family: string): string =>
  `The string literal ${value} is one of ${String(count)} values in a closed ${family} domain. Declare the domain in a shared enum at the consumers' CCF and reuse it. ${DOC}`;

file("constants/routes.ts", 'export enum ApiRoute { Existing = "/api/existing", Other = "/api/other" }');
file("constants/timers.ts", "export const retryDelayMs = 5000;");
file(
  "constants/api-contracts.ts",
  'defineApiContract({ path: "/api/credentials/[id]" }); defineApiContract({ path: "/api/credentials/[id]" });',
);
file("constants/columns.ts", 'export enum DraftColumnEnum { ChannelSourceId = "channel_source_id" }');
file(
  "features/publishing/route-a.ts",
  'fetch("/api/publish"); fetch("/api/drafts"); fetch("/api/existing"); fetch("https://example.com");',
);
file("features/publishing/route-b.ts", 'fetch("/api/publish"); fetch("/api/drafts");');
file("features/publishing/timers-a.ts", "setTimeout(handler, 9000); setTimeout(handler, 5000);");
file("features/publishing/timers-b.ts", "setTimeout(handler, 9000);");
file("features/publishing/status-a.ts", 'export const state = { status: "queued" };');
file("features/publishing/status-b.ts", 'export const draft = { status: "queued" };');
file("features/payments/status.ts", 'export const payment = { status: "queued" };');
file(
  "features/publishing/imported-route.ts",
  'import { ApiRoute } from "@/constants"; const data = { path: "/api/existing" };',
);
file("features/publishing/column.ts", 'query.eq("channel_source_id", "x"); query.eq("id", "x");');
file("features/publishing/copy.ts", 'const message = "user not found"; const label = "success";');
file("features/publishing/unrelated.ts", 'const onlyOnce = "unique-value";');
file("features/publishing/one-off-route.ts", 'const route = { path: "/api/new-route" };');
file("features/publishing/mixed-events.ts", 'eventBus.emit("draft:queued"); eventBus.on("draft:deleted", callback);');
file(
  "features/publishing/mixed-storage.ts",
  'localStorage.getItem("draft:alpha"); localStorage.setItem("draft:beta", "x");',
);
file("features/publishing/example.test.ts", 'fetch("/api/publish");');
file(
  "features/publishing/storage.ts",
  'localStorage.getItem("draft:key"); localStorage.setItem("draft:key", "value");',
);
file("features/publishing/events.ts", 'eventBus.emit("draft:stored"); eventBus.on("draft:stored", handler);');

void describe("A string or numeric literal MUST reuse a uniquely matching existing constant or enum; repeated literals representing the same semantic value MUST share one canonical definition.", () => {
  void describe("A reusable, closed set of two or more related string or numeric values MUST use a TypeScript `enum`; recognized closed runtime string domains MUST reuse a shared enum even when each member appears only once.", () => {
    ruleTester.run("repeated-semantic-literal", repeatedSemanticLiteralRule, {
      valid: [
        file("features/publishing/unrelated.ts", 'const onlyOnce = "unique-value";'),
        file("features/payments/status.ts", 'export const payment = { status: "queued" };'),
        file("features/publishing/copy.ts", 'const message = "user not found"; const label = "success";'),
        file("features/publishing/example.test.ts", 'fetch("/api/publish");'),
      ],
      invalid: [
        {
          filename: path.join(root, "src/features/publishing/one-off-route.ts"),
          code: 'const route = { path: "/api/new-route" };',
          errors: [{ message: newRoute('"/api/new-route"') }],
        },
        {
          filename: path.join(root, "src/features/publishing/mixed-events.ts"),
          code: 'eventBus.emit("draft:queued"); eventBus.on("draft:deleted", callback);',
          errors: [
            { message: closedDomain('"draft:queued"', 3, "event") },
            { message: closedDomain('"draft:deleted"', 3, "event") },
          ],
        },
        {
          filename: path.join(root, "src/features/publishing/mixed-storage.ts"),
          code: 'localStorage.getItem("draft:alpha"); localStorage.setItem("draft:beta", "x");',
          errors: [
            { message: closedDomain('"draft:alpha"', 3, "storage") },
            { message: closedDomain('"draft:beta"', 3, "storage") },
          ],
        },
        {
          filename: path.join(root, "src/features/publishing/imported-route.ts"),
          code: 'import { ApiRoute } from "@/constants"; const data = { path: "/api/existing" };',
          errors: [{ message: reused("ApiRoute.Existing", '"/api/existing"', "constants/routes.ts") }],
        },
        {
          filename: path.join(root, "src/constants/api-contracts.ts"),
          code: 'defineApiContract({ path: "/api/credentials/[id]" }); defineApiContract({ path: "/api/credentials/[id]" });',
          errors: [{ message: addRoute('"/api/credentials/[id]"') }, { message: addRoute('"/api/credentials/[id]"') }],
        },
        {
          filename: path.join(root, "src/features/publishing/route-a.ts"),
          code: 'fetch("/api/publish"); fetch("/api/drafts"); fetch("/api/existing"); fetch("https://example.com");',
          errors: [
            { message: addRoute('"/api/publish"') },
            { message: addRoute('"/api/drafts"') },
            { message: reused("ApiRoute.Existing", '"/api/existing"', "constants/routes.ts") },
          ],
        },
        {
          filename: path.join(root, "src/features/publishing/route-b.ts"),
          code: 'fetch("/api/publish"); fetch("/api/drafts");',
          errors: [{ message: addRoute('"/api/publish"') }, { message: addRoute('"/api/drafts"') }],
        },
        {
          filename: path.join(root, "src/features/publishing/timers-a.ts"),
          code: "setTimeout(handler, 9000); setTimeout(handler, 5000);",
          errors: [
            { message: across("numeric", "9000", 2, "one shared const") },
            { message: reused("retryDelayMs", "5000", "constants/timers.ts") },
          ],
        },
        {
          filename: path.join(root, "src/features/publishing/timers-b.ts"),
          code: "setTimeout(handler, 9000);",
          errors: [{ message: across("numeric", "9000", 2, "one shared const") }],
        },
        {
          filename: path.join(root, "src/features/publishing/status-a.ts"),
          code: 'export const state = { status: "queued" };',
          errors: [{ message: across("string", '"queued"', 2, "one shared const") }],
        },
        {
          filename: path.join(root, "src/features/publishing/status-b.ts"),
          code: 'export const draft = { status: "queued" };',
          errors: [{ message: across("string", '"queued"', 2, "one shared const") }],
        },
        {
          filename: path.join(root, "src/features/publishing/column.ts"),
          code: 'query.eq("channel_source_id", "x"); query.eq("id", "x");',
          errors: [
            { message: reused("DraftColumnEnum.ChannelSourceId", '"channel_source_id"', "constants/columns.ts") },
          ],
        },
        {
          filename: path.join(root, "src/features/publishing/storage.ts"),
          code: 'localStorage.getItem("draft:key"); localStorage.setItem("draft:key", "value");',
          errors: [{ message: local("string", '"draft:key"') }, { message: local("string", '"draft:key"') }],
        },
        {
          filename: path.join(root, "src/features/publishing/events.ts"),
          code: 'eventBus.emit("draft:stored"); eventBus.on("draft:stored", handler);',
          errors: [{ message: local("string", '"draft:stored"') }, { message: local("string", '"draft:stored"') }],
        },
      ],
    });
  });
});
