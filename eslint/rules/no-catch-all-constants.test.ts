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
    expect(messages.join("\n")).toContain("DateTimeFormatOptions");
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

void describe("Typed domains are inferred from contracts without a manual API registry.", () => {
  it("keeps structurally identical named aliases distinct across declarations", () => {
    const messages = lint(
      {
        "constants/index.ts": 'export const first = "ready";\nexport const second = "waiting";',
        "contracts.ts":
          'export type JobState = "ready" | "waiting";\nexport type ConnectionState = "ready" | "waiting";',
        "consumer.ts":
          'import { first, second } from "./constants"; import type { JobState, ConnectionState } from "./contracts"; declare function job(x: JobState): void; declare function connection(x: ConnectionState): void; job(first); connection(second);',
      },
      "constants/index.ts",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("JobState");
    expect(messages[0]).toContain("ConnectionState");
  });

  it("detects one value reused across unrelated named domains", () => {
    const messages = lint(
      {
        "constants/index.ts": 'export const value = "ready";',
        "consumer.ts":
          'import { value } from "./constants"; type JobState = "ready" | "waiting"; type ConnectionState = "ready" | "waiting"; declare function job(x: JobState): void; declare function connection(x: ConnectionState): void; job(value); connection(value);',
      },
      "constants/index.ts",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("consumed in distinct semantic domains");
  });

  it("follows alias chains and recognizes interface properties and parameters as one named domain", () => {
    expect(
      lint(
        {
          "constants/index.ts": 'export const first = "ready";\nexport const second = "waiting";',
          "contracts.ts":
            'export type JobState = "ready" | "waiting"; export type Alias = JobState; export interface Job { status: JobState }',
          "consumer.ts":
            'import { first, second } from "./constants"; import type { Job, Alias } from "./contracts"; declare function use(x: Alias): void; use(first); export const job: Job = { status: second };',
        },
        "constants/index.ts",
      ),
    ).toEqual([]);
  });

  it("keeps independent inline interface contracts separate", () => {
    const messages = lint(
      {
        "constants/index.ts": 'export const first = "ready";\nexport const second = "waiting";',
        "consumer.ts":
          'import { first, second } from "./constants"; interface Job { status: "ready" | "waiting" } interface Connection { status: "ready" | "waiting" } export const job: Job = { status: first }; export const connection: Connection = { status: second };',
      },
      "constants/index.ts",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Job");
    expect(messages[0]).toContain("Connection");
  });

  it("does not assume co-located enums are unrelated merely because they have distinct identities", () => {
    const messages = lint(
      {
        "constants/index.ts":
          'export enum Job { Ready = "ready", Waiting = "waiting" } export enum Connection { Ready = "ready", Waiting = "waiting" }',
        "consumer.ts":
          'import { Job, Connection } from "./constants"; declare function job(x: Job): void; declare function connection(x: Connection): void; job(Job.Ready); connection(Connection.Ready);',
      },
      "constants/index.ts",
    );
    expect(messages).toEqual([]);
  });

  it("does not infer a domain from generic inference, broad types, or unknown calls", () => {
    expect(
      lint(
        {
          "constants/index.ts": 'export const first = "ready";\nexport const second = "waiting";',
          "consumer.ts":
            'import { first, second } from "./constants"; declare function generic<T extends string>(x: T): void; declare function broad(x: string): void; generic(first); broad(second);',
        },
        "constants/index.ts",
      ),
    ).toEqual([]);
  });

  it("does not deduplicate equal literals belonging to independent typed contracts", () => {
    expect(
      lint(
        {
          "constants/job.ts": 'export const readyJob = "ready";',
          "features/connection/state.ts": 'export const readyConnection = "ready";',
          "consumer.ts":
            'import { readyJob } from "./constants/job"; import { readyConnection } from "./features/connection/state"; type JobState = "ready" | "waiting"; type ConnectionState = "ready" | "waiting"; declare function job(x: JobState): void; declare function connection(x: ConnectionState): void; job(readyJob); connection(readyConnection);',
        },
        "features/connection/state.ts",
        repeatedSemanticLiteralRule,
      ),
    ).toEqual([]);
  });
});

void describe("Typed contract identity preserves enum projections and does not confuse package ownership with identity.", () => {
  it("recognizes enum projections as the original domain", () => {
    expect(
      lint(
        {
          "constants/index.ts":
            'export enum Action { Expand = "expand", Shorten = "shorten", Translate = "translate" }',
          "consumer.ts":
            'import { Action } from "./constants"; type LimitAction = Action.Expand | Action.Shorten; type ExtendedAction = Action | "custom"; declare function use(x: Action): void; declare function limit(x: LimitAction): void; declare function extended(x: ExtendedAction): void; use(Action.Expand); limit(Action.Expand); extended(Action.Expand);',
        },
        "constants/index.ts",
      ),
    ).toEqual([]);
  });

  it("does not treat different views of a library vocabulary as a proven conflict", () => {
    expect(
      lint(
        {
          "constants/index.ts": 'export const first = "hex";\nexport const second = "utf8";',
          "node_modules/example/index.d.ts":
            'export type BinaryEncoding = "hex" | "base64"; export type Encoding = BinaryEncoding | "utf8"; export function binary(x: BinaryEncoding): void; export function text(x: Encoding): void;',
          "consumer.ts":
            'import { first, second } from "./constants"; import { binary, text } from "example"; binary(first); text(first); text(second);',
        },
        "constants/index.ts",
      ),
    ).toEqual([]);
  });

  it("still distinguishes library contract identities for literal deduplication", () => {
    expect(
      lint(
        {
          "constants/job.ts": 'export const readyJob = "ready";',
          "features/connection/state.ts": 'export const readyConnection = "ready";',
          "node_modules/example/index.d.ts":
            'export type JobState = "ready" | "waiting"; export type ConnectionState = "ready" | "waiting"; export function job(x: JobState): void; export function connection(x: ConnectionState): void;',
          "consumer.ts":
            'import { readyJob } from "./constants/job"; import { readyConnection } from "./features/connection/state"; import { job, connection } from "example"; job(readyJob); connection(readyConnection);',
        },
        "features/connection/state.ts",
        repeatedSemanticLiteralRule,
      ),
    ).toEqual([]);
  });
});
