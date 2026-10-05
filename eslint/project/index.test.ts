import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { clearProjectIndex, getProjectIndex } from "./index";

const tempDirs: string[] = [];

afterEach(() => {
  clearProjectIndex();
  for (const dir of tempDirs.splice(0)) rmSync(dir, { force: true, recursive: true });
});

describe("project index cache", () => {
  it("tracks symbols consumed through namespace imports", () => {
    const sourceRoot = mkdtempSync(path.join(tmpdir(), "pasika-project-index-"));
    tempDirs.push(sourceRoot);
    const schemaFile = path.join(sourceRoot, "schemas.ts");
    const clientFile = path.join(sourceRoot, "client.ts");

    writeFileSync(schemaFile, "export const ordersApiContract = {};\n");
    writeFileSync(
      clientFile,
      ['import * as apiContracts from "./schemas";', "void apiContracts.ordersApiContract;", ""].join("\n"),
    );

    const index = getProjectIndex(sourceRoot);
    expect(index?.symbolConsumers.get(`${schemaFile}\u0000ordersApiContract`)).toEqual(new Set([clientFile]));
  });

  it("rebuilds the index after the cache is cleared", () => {
    const sourceRoot = mkdtempSync(path.join(tmpdir(), "pasika-project-index-"));
    tempDirs.push(sourceRoot);
    writeFileSync(path.join(sourceRoot, "value.ts"), "export const value = 1;\n");

    const first = getProjectIndex(sourceRoot);
    expect(first).toBeDefined();
    expect(getProjectIndex(sourceRoot)).toBe(first);

    clearProjectIndex();

    const rebuilt = getProjectIndex(sourceRoot);
    expect(rebuilt).toBeDefined();
    expect(rebuilt).not.toBe(first);
  });
});
