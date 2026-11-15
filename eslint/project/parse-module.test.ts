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
  it("classifies local named exports without treating external re-exports as locally owned", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-parse-module-"));
    tempDirs.push(root);
    const file = path.join(root, "constants.ts");
    writeFileSync(
      file,
      [
        'const imageSizes = "100vw";',
        'enum ProductKind { Merch = "merch" }',
        "type Product = { name: string };",
        "export { imageSizes, ProductKind as Kind, type Product };",
        'export { unrelated } from "./elsewhere";',
        "",
      ].join("\n"),
    );

    expect(parseModule(file).exports).toEqual([
      { name: "imageSizes", kind: "constant", line: 4 },
      { name: "Kind", kind: "constant", line: 4 },
      { name: "Product", kind: "type", line: 4 },
      { name: "unrelated", kind: "other", line: 5 },
    ]);
  });

  it("records local references from runtime initializers but not export declarations", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-parse-module-"));
    tempDirs.push(root);
    const file = path.join(root, "merch.ts");
    writeFileSync(
      file,
      [
        'enum FilterType { Clothing = "clothing" }',
        "const products = [{ category: FilterType.Clothing }];",
        "export { FilterType, products };",
        "",
      ].join("\n"),
    );
    expect(parseModule(file).localValueReferences).toContain("FilterType");
    expect(parseModule(file).localValueReferences).not.toContain("products");
  });

  it("records type-only imports separately from runtime symbol uses", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-parse-module-"));
    tempDirs.push(root);
    const file = path.join(root, "consumer.ts");
    writeFileSync(
      file,
      [
        'import type { products } from "./constants";',
        'import { type Product, imageSizes } from "./constants";',
        "",
      ].join("\n"),
    );
    expect(parseModule(file).imports).toEqual([
      { specifier: "./constants", names: ["products"], typeOnlyNames: ["products"], line: 1 },
      {
        specifier: "./constants",
        names: ["Product", "imageSizes"],
        typeOnlyNames: ["Product"],
        line: 2,
      },
    ]);
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
