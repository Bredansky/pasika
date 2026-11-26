import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import tsParser from "@typescript-eslint/parser";
import { Linter } from "eslint";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { clearProjectIndex } from "../project/index";
import { noCatchAllConstantsRule } from "./no-catch-all-constants";
import { repeatedSemanticLiteralRule } from "./repeated-semantic-literal";

function lint(files: Record<string, string>, entry: string, rule = noCatchAllConstantsRule, typed = true): string[] {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-domains-"));
  try {
    const names = Object.entries(files).map(([relative, code]) => {
      const file = path.join(root, "src", relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, code);
      return file;
    });
    const program = ts.createProgram(names, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve,
      strict: true,
      types: [],
    });
    const filename = path.join(root, "src", entry);
    const linter = new Linter({ cwd: root });
    clearProjectIndex();
    return linter
      .verify(
        readFileSync(filename, "utf8"),
        [
          {
            files: ["**/*.{ts,tsx}"],
            languageOptions: { parser: tsParser, parserOptions: typed ? { programs: [program] } : {} },
            plugins: { pasika: { rules: { domains: rule } } },
            rules: { "pasika/domains": "error" },
          },
        ],
        { filename },
      )
      .map((message) => message.message);
  } finally {
    clearProjectIndex();
    rmSync(root, { recursive: true, force: true });
  }
}

void describe("A constants module with exported values proven to belong to distinct semantic domains MUST be split into cohesive, domain-named modules.", () => {
  it("detects mixing and cross-domain reuse in an index, even with identical prefixes", () => {
    const messages = lint(
      {
        "features/editor/constants/index.ts":
          'export const editorA = "group";\nexport const editorB = "file";\nexport const editorC = "numeric";\nexport const editorD = "captions";',
        "features/editor/barrel.ts": 'export * from "./constants";',
        "features/editor/consumer.tsx":
          'import { editorA as a, editorB as b, editorC as c, editorD as d } from "./barrel";\nexport function view(item: DataTransferItem) { const options: Intl.DateTimeFormatOptions = { year: c }; return <div role={a} data-sidebar={a}><input type={b} /><track kind={d} />{item.kind === b}{options.year}</div>; }',
      },
      "features/editor/constants/index.ts",
    );
    expect(messages).toHaveLength(3);
    expect(messages.join("\n")).toContain("aria:role, component-marker:data-sidebar");
    expect(messages.join("\n")).toContain("clipboard:item-kind, html:input-type");
    expect(messages.join("\n")).toContain("date-format (editorC)");
  });

  it("accepts one proven domain regardless of divergent declaration names", () => {
    expect(
      lint(
        {
          "constants/values.ts":
            'export const apple = "group";\nexport const banana = "region";\nexport const lemon = "textbox";',
          "view.tsx":
            'import { apple, banana, lemon } from "./constants/values"; export const view = <div role={apple}><div role={banana} /><div role={lemon} /></div>;',
        },
        "constants/values.ts",
      ),
    ).toEqual([]);
  });

  it("ignores unknown domains, test consumers and shadowed identifiers", () => {
    expect(
      lint(
        {
          "constants/index.ts": 'export const apple = "group";\nexport const banana = "file";',
          "view.tsx":
            'import { apple, banana } from "./constants"; const use = (banana: string) => <input type={banana} />; export const view = <div role={apple}>{banana}{use(apple)}</div>;',
          "view.test.tsx": 'import { banana } from "./constants"; export const view = <input type={banana} />;',
        },
        "constants/index.ts",
      ),
    ).toEqual([]);
  });

  it("recognizes enum members and namespace imports", () => {
    const messages = lint(
      {
        "constants/anything.ts": 'export enum Role { Group = "group" }\nexport const unrelated = "function";',
        "view.tsx":
          'import * as values from "./constants/anything"; export const view = <div role={values.Role.Group}>{typeof view === values.unrelated}</div>;',
      },
      "constants/anything.ts",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("aria (Role)");
    expect(messages[0]).toContain("js-type (unrelated)");
  });

  it("does not treat an unrelated object kind property as a DOM contract", () => {
    expect(
      lint(
        {
          "constants/index.ts": 'export const first = "group";\nexport const second = "file";',
          "view.tsx":
            'import { first, second } from "./constants"; const item = { kind: "file" }; export const view = <div role={first}>{item.kind === second}</div>;',
        },
        "constants/index.ts",
      ),
    ).toEqual([]);
  });

  it("does not guess without type services", () => {
    expect(
      lint(
        {
          "constants/index.ts": 'export const first = "group";\nexport const second = "file";',
          "view.tsx":
            'import { first, second } from "./constants"; export const view = <div role={first}><input type={second} /></div>;',
        },
        "constants/index.ts",
        noCatchAllConstantsRule,
        false,
      ),
    ).toEqual([]);
  });

  it("keeps a pure barrel free of reports", () => {
    expect(
      lint(
        {
          "constants/index.ts": 'export * from "./aria"; export * from "./html";',
          "constants/aria.ts": 'export const first = "group";',
          "constants/html.ts": 'export const second = "file";',
          "view.tsx":
            'import { first, second } from "./constants"; export const view = <div role={first}><input type={second} /></div>;',
        },
        "constants/index.ts",
      ),
    ).toEqual([]);
  });
});

void describe("Known distinct semantic domains must not be deduplicated by string equality.", () => {
  const files = {
    "constants/aria.ts": 'export const role = "group";',
    "features/sidebar/marker.ts": 'export const marker = "group";',
    "view.tsx":
      'import { role } from "./constants/aria"; import { marker } from "./features/sidebar/marker"; export const view = <div role={role} data-sidebar={marker} />;',
  };
  it("allows equal literal values with proven distinct consumer domains", () => {
    expect(lint(files, "features/sidebar/marker.ts", repeatedSemanticLiteralRule)).toEqual([]);
  });
  it("retains canonical reuse inside the same known domain", () => {
    const same = {
      ...files,
      "view.tsx":
        'import { role } from "./constants/aria"; import { marker } from "./features/sidebar/marker"; export const view = <div role={role}><div role={marker} /></div>;',
    };
    expect(lint(same, "features/sidebar/marker.ts", repeatedSemanticLiteralRule).join("\n")).toContain("Reuse role");
  });
});
