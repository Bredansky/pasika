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
file("features/publishing/example.test.ts", 'fetch("/api/publish");');
file(
  "features/publishing/storage.ts",
  'localStorage.getItem("draft:key"); localStorage.setItem("draft:key", "value");',
);
file("features/publishing/events.ts", 'eventBus.emit("draft:stored"); eventBus.on("draft:stored", handler);');

void describe("A raw string or number MUST reuse a uniquely matching canonical constant or enum, or be extracted when the same meaningful semantic value recurs within or across production files; a single reusable value MUST use a `const` local to its file or at its consumers' CCF, while a known closed set of multiple related values MUST use an `enum`.", () => {
  ruleTester.run("repeated-semantic-literal", repeatedSemanticLiteralRule, {
    valid: [
      file("features/publishing/unrelated.ts", 'const onlyOnce = "unique-value";'),
      file("features/payments/status.ts", 'export const payment = { status: "queued" };'),
      file("features/publishing/copy.ts", 'const message = "user not found"; const label = "success";'),
      file("features/publishing/example.test.ts", 'fetch("/api/publish");'),
      file(
        "features/publishing/imported-route.ts",
        'import { ApiRoute } from "@/constants"; const data = { path: "/api/existing" };',
      ),
    ],
    invalid: [
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
        errors: [{ message: reused("DraftColumnEnum.ChannelSourceId", '"channel_source_id"', "constants/columns.ts") }],
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
