import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseModule } from "./parse-module";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { force: true, recursive: true });
});

describe("parseModule", () => {
  it("collects names exported through object destructuring", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-parse-module-"));
    tempDirs.push(root);
    const file = path.join(root, "ai-text-edit-mock.ts");

    writeFileSync(
      file,
      [
        'const textEditApiContract = { path: "/api/text-edit" };',
        "export const { path: apiRoutePath } = textEditApiContract;",
        "export function handlePost() { return new Response(); }",
        "",
      ].join("\n"),
    );

    expect(parseModule(file).exports).toEqual([
      { name: "apiRoutePath", kind: "constant", line: 2 },
      { name: "handlePost", kind: "function", line: 3 },
    ]);
  });
});
