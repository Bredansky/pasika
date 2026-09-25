import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildStylesheetGraph,
  importedSpecifiers,
  moduleImports,
  registersTailwind,
  resolveSpecifier,
} from "./stylesheet-graph";

describe("stylesheet graph helpers", () => {
  it("recognizes Tailwind registration and stylesheet imports", () => {
    expect(registersTailwind('@import "tailwindcss";')).toBe(true);
    expect(registersTailwind('@import url("tailwindcss");')).toBe(true);
    expect(registersTailwind(".card {}")).toBe(false);
    expect(importedSpecifiers('@import "./theme.css"; @import url("package.css");')).toEqual([
      "./theme.css",
      "package.css",
    ]);
    expect(moduleImports('import "./global.css";', "global.css")).toBe(true);
    expect(moduleImports('import "./global.css";', "other.css")).toBe(false);
  });

  it("resolves project specifiers and ignores package specifiers", () => {
    const root = path.resolve("/repo/src");
    const from = path.join(root, "app/styles/globals.css");

    expect(resolveSpecifier(from, "/theme.css", root)).toBe(path.resolve("/theme.css"));
    expect(resolveSpecifier(from, "./theme.css", root)).toBe(path.join(root, "app/styles/theme.css"));
    expect(resolveSpecifier(from, "./nested/tokens.css", root)).toBe(path.join(root, "app/styles/nested/tokens.css"));
    expect(resolveSpecifier(from, "@/app/styles/theme.css", root)).toBe(path.join(root, "app/styles/theme.css"));
    expect(resolveSpecifier(from, "tailwindcss", root)).toBeUndefined();
  });

  it("tracks direct and transitive stylesheet imports without revisiting cycles", () => {
    const root = path.resolve("/repo/src");
    const global = path.join(root, "app/styles/globals.css");
    const theme = path.join(root, "app/styles/theme.css");
    const tokens = path.join(root, "app/styles/tokens.css");
    const orphan = path.join(root, "app/styles/orphan.css");
    const contents = new Map([
      [global, '@import "tailwindcss"; @import "./theme.css"; @import "package.css";'],
      [theme, '@import "./tokens.css";'],
      [tokens, '@import "./theme.css";'],
      [orphan, ".orphan {}"],
    ]);

    const graph = buildStylesheetGraph({
      cssFiles: [...contents.keys()],
      sourceRoot: root,
      textOf: (file) => contents.get(file) ?? "",
    });

    expect(graph.globals).toEqual([global]);
    expect(graph.reachable).toEqual(new Set([global, theme, tokens]));
    expect(graph.directChildren).toEqual(new Set([theme]));
  });
});
