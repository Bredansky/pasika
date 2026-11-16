import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { moduleDependencies, serverSupportModules } from "./server-support-modules";

function dependencies(text: string): { specifier: string; runtime: boolean }[] {
  return moduleDependencies(ts.createSourceFile("example.ts", text, ts.ScriptTarget.Latest, true));
}

describe("Module dependency classification", () => {
  it("does not treat type-only syntax as a runtime import", () => {
    expect(
      dependencies(`
        import type { Stats } from "node:fs";
        import { type FileInfo } from "./internal";
        export type { Shape } from "./private";
        export { type Other } from "./other";
      `),
    ).toEqual([
      { specifier: "node:fs", runtime: false },
      { specifier: "./internal", runtime: false },
      { specifier: "./private", runtime: false },
      { specifier: "./other", runtime: false },
    ]);
  });

  it("retains mixed, side-effect, dynamic, require and runtime re-export edges", () => {
    expect(
      dependencies(`
        import { type Shape, value } from "./mixed";
        import "server-only";
        export * from "./public";
        export { type Shape, value } from "./named";
        const lazy = () => import("./dynamic");
        const commonjs = require("./require");
      `),
    ).toEqual([
      { specifier: "./mixed", runtime: true },
      { specifier: "server-only", runtime: true },
      { specifier: "./public", runtime: true },
      { specifier: "./named", runtime: true },
      { specifier: "./dynamic", runtime: true },
      { specifier: "./require", runtime: true },
    ]);
  });

  it("ignores import-like strings and comments", () => {
    expect(
      dependencies(`// import { secret } from "./private"
      const text = "import { secret } from './private'";
      /* require("./private") */
    `),
    ).toEqual([]);
  });
});

describe("Server support module detection", () => {
  it("recognizes barrel members and transitive runtime dependencies, not type-only Node imports", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-server-dependencies-"));
    try {
      const directory = path.join(root, "src", "schemas", "api");
      mkdirSync(directory, { recursive: true });
      writeFileSync(path.join(directory, "index.ts"), "export const shared = 1;");
      writeFileSync(path.join(directory, "server.ts"), 'import "server-only"; export * from "./private";');
      writeFileSync(path.join(directory, "private.ts"), "export const secret = 1;");
      writeFileSync(path.join(directory, "bridge.ts"), 'export * from "./private";');
      writeFileSync(
        path.join(directory, "types-only.ts"),
        'import { type Stats } from "node:fs"; export type Info = Stats;',
      );
      writeFileSync(path.join(directory, "dynamic.ts"), 'export const load = () => import("node:fs");');
      writeFileSync(
        path.join(directory, "named-node.ts"),
        'import type { Stats } from "node:fs"; export type Info = Stats;',
      );
      const names = serverSupportModules(directory);
      expect([...names].sort()).toEqual(["bridge", "dynamic", "private"].sort());
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
