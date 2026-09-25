import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cachedTextReader, findFiles, SOURCE_EXTENSIONS } from "./source-files";

describe("Tailwind source-file helpers", () => {
  it("walks supported source files and ignores hidden, dependency, missing, and unsupported entries", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-tailwind-files-"));
    mkdirSync(path.join(root, "nested"), { recursive: true });
    mkdirSync(path.join(root, ".hidden"), { recursive: true });
    mkdirSync(path.join(root, "node_modules"), { recursive: true });

    writeFileSync(path.join(root, "component.tsx"), "export const Component = 1;\n");
    writeFileSync(path.join(root, "nested", "theme.css"), ":root {}\n");
    writeFileSync(path.join(root, "notes.txt"), "ignore\n");
    writeFileSync(path.join(root, ".hidden", "hidden.ts"), "ignore\n");
    writeFileSync(path.join(root, "node_modules", "dependency.ts"), "ignore\n");
    symlinkSync(path.join(root, "missing-target"), path.join(root, "broken.ts"));

    const files = findFiles(root, SOURCE_EXTENSIONS)
      .map((file) => path.relative(root, file))
      .sort();

    expect(files).toEqual(["component.tsx", path.join("nested", "theme.css")]);
    expect(findFiles(path.join(root, "missing"), SOURCE_EXTENSIONS)).toEqual([]);
  });

  it("caches successful and failed reads", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-tailwind-reader-"));
    const file = path.join(root, "value.ts");
    const missing = path.join(root, "missing.ts");
    writeFileSync(file, "first\n");

    const read = cachedTextReader();
    expect(read(file)).toBe("first\n");
    writeFileSync(file, "second\n");
    expect(read(file)).toBe("first\n");
    expect(read(missing)).toBe("");
    writeFileSync(missing, "later\n");
    expect(read(missing)).toBe("");
  });
});
