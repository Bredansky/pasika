import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { featureOf, getSemanticLiteralIndex, isProductionSource } from "./semantic-literals";
import { getProjectIndex } from "./index";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-semantic-index-")));
const src = path.join(root, "src");
const put = (name: string, code: string): string => {
  const filename = path.join(src, name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return filename;
};

put(
  "constants/routes.ts",
  'export enum ApiRoute { One = "/api/one", Other = "/api/other" }; export const timeoutMs = 2000; const localValue = "not-exported";',
);
put("constants/negative.ts", "export const negativeDelay = -7;");
put("constants/api-contracts.ts", 'contract({ path: "/api/missing/[id]" }); contract({ path: "/api/missing/[id]" });');
put(
  "features/editor/uses.ts",
  [
    'fetch("/api/one"); zodFetch("/api/two"); fetch("https://example.com");',
    "setTimeout(run, 2000); setInterval(run, 3000); setTimeout(run, 0); setTimeout(run, -1);",
    'localStorage.getItem("draft:saved"); sessionStorage.setItem("draft:saved", "x");',
    'eventBus.emit("editor:saved"); eventBus.on("editor:saved", run);',
    'query.eq("channel_source_id", "value"); query.order("created_at");',
    'request.nextUrl.pathname === "/api/one"; request.nextUrl.pathname.startsWith("/api/auth/");',
    'const config = { status: "pending", path: "/api/config", label: "copy", retries: 3 };',
    'const eventName = "editor:saved"; const label = "ignored-value";',
    'const skipped = { title: "user message", display: "clamp", status: "has spaces" };',
    'const computed = { [dynamicKey]: "computed-value" };',
    'client["setTimeout"](run, 2000);',
  ].join("\n"),
);
put("features/editor/other.ts", 'export const state = { status: "pending", eventName: "editor:saved" };');
put("features/finance/status.ts", 'export const status = { status: "pending" };');
put("features/editor/widget.tsx", 'export const Widget = () => <button title="hello">Click</button>;');
put("features/editor/uses.test.ts", 'fetch("/api/test-only");');
put("features/editor/uses.spec.ts", 'fetch("/api/test-only");');
put("features/editor/uses.mock.ts", 'fetch("/api/test-only");');
put("features/__tests__/hidden.ts", 'fetch("/api/test-only");');
put("features/__mocks__/hidden.ts", 'fetch("/api/test-only");');
put("features/mocks/hidden.ts", 'fetch("/api/test-only");');

void describe("Semantic literal project indexing", () => {
  it("indexes only production files and resolves their feature scope", () => {
    expect(isProductionSource(path.join(src, "features/editor/uses.ts"), src)).toBe(true);
    for (const relative of [
      "features/editor/uses.test.ts",
      "features/editor/uses.spec.ts",
      "features/editor/uses.mock.ts",
      "features/__tests__/hidden.ts",
      "features/__mocks__/hidden.ts",
      "features/mocks/hidden.ts",
    ]) {
      expect(isProductionSource(path.join(src, relative), src)).toBe(false);
    }
    expect(featureOf(path.join(src, "features/editor/uses.ts"), src)).toBe("feature:editor");
    expect(featureOf(path.join(src, "app/page.tsx"), src)).toBe("layer:app");
  });

  it("collects route, column, timer, event, storage, status and variable roles", () => {
    const project = getProjectIndex(src);
    expect(project).toBeDefined();
    if (!project) return;
    const index = getSemanticLiteralIndex(project);
    const roles = index.uses.map((entry) => entry.role);
    expect(roles).toContain("api-route");
    expect(roles).toContain("column:feature:editor");
    expect(roles).toContain("timer:setTimeout:feature:editor");
    expect(roles).toContain("timer:setInterval:feature:editor");
    expect(roles).toContain("storage:localStorage");
    expect(roles).toContain("storage:sessionStorage");
    expect(roles).toContain("event:eventBus");
    expect(roles).toContain("property:status:feature:editor");
    expect(roles).toContain("variable:eventName:feature:editor");
    expect(index.uses.filter((use) => use.value === "/api/missing/[id]").length).toBe(2);
    expect(index.uses.filter((use) => use.value === "/api/one").length).toBe(2);
    expect(index.uses.filter((use) => use.value === "pending").length).toBe(3);
    expect(getSemanticLiteralIndex(project)).toBe(index);
  });

  it("excludes UI, external, framework and test literals without losing canonical definitions", () => {
    const project = getProjectIndex(src);
    expect(project).toBeDefined();
    if (!project) return;
    const index = getSemanticLiteralIndex(project);
    const values = index.uses.map((use) => use.value);
    for (const excluded of [
      "https://example.com",
      "ignored-value",
      "user message",
      "clamp",
      "has spaces",
      "computed-value",
      "/api/test-only",
      "not-exported",
      -1,
      0,
      3,
    ]) {
      expect(values).not.toContain(excluded);
    }
    expect(index.canonicals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ owner: "ApiRoute", name: "One", value: "/api/one" }),
        expect.objectContaining({ name: "timeoutMs", value: 2000 }),
        expect.objectContaining({ name: "negativeDelay", value: -7 }),
      ]),
    );
    expect(index.canonicals.some((entry) => entry.name === "localValue")).toBe(false);
  });
});
