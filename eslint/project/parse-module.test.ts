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
  it("collects namespace member imports as symbol consumers", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-parse-module-"));
    tempDirs.push(root);
    const file = path.join(root, "client.ts");

    writeFileSync(
      file,
      [
        'import * as apiContracts from "./schemas";',
        "void apiContracts.ordersApiContract;",
        'void apiContracts["usersApiContract"];',
        "",
      ].join("\n"),
    );

    expect(parseModule(file).imports).toEqual([
      {
        specifier: "./schemas",
        names: ["ordersApiContract", "usersApiContract"],
        line: 1,
      },
    ]);
  });


  it("classifies API contracts as constants rather than schemas", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-parse-module-"));
    tempDirs.push(root);
    const file = path.join(root, "api-contracts.ts");

    writeFileSync(
      file,
      [
        'import { defineApiContract } from "pasika/api-contract";',
        "export const ordersApiContract = defineApiContract({ method, path, responseSchema });",
        "",
      ].join("\n"),
    );

    expect(parseModule(file).exports).toEqual([{ name: "ordersApiContract", kind: "constant", line: 2 }]);
  });

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
