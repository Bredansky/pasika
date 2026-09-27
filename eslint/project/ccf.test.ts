import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hasComponentOwner, hasExactEntry } from "./ccf";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { force: true, recursive: true });
});

describe("component folder owner casing", () => {
  it("matches directory entries by exact case", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pasika-component-owner-"));
    tempDirs.push(dir);
    writeFileSync(path.join(dir, "Poster.tsx"), "export function Poster() { return null; }\n");

    expect(hasExactEntry(dir, "Poster.tsx")).toBe(true);
    expect(hasExactEntry(dir, "poster.tsx")).toBe(false);
    expect(hasComponentOwner(dir, "Poster")).toBe(true);
    expect(hasComponentOwner(dir, "poster")).toBe(false);
  });

  it("returns false when the directory cannot be read", () => {
    expect(hasExactEntry(path.join(tmpdir(), "pasika-missing-component-folder"), "Poster.tsx")).toBe(false);
  });
});
