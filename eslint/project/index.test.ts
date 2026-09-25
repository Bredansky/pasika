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
