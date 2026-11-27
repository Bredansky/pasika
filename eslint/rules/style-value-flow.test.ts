import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import tsParser from "@typescript-eslint/parser";
import { Linter } from "eslint";
import ts from "typescript";
import { expect, test } from "vitest";
import { noArbitraryTailwindRule } from "./no-arbitrary-tailwind";
import { noStylingClassAliasRule } from "./no-styling-class-alias";

function lint(code: string, extra = ""): Linter.LintMessage[] {
  const root = mkdtempSync(path.join(tmpdir(), "pasika-style-flow-"));
  const previous = process.cwd();
  try {
    process.chdir(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    const file = path.join(root, "src", "card.tsx");
    const shared = path.join(root, "src", "styles.ts");
    writeFileSync(file, code);
    writeFileSync(shared, extra);
    const program = ts.createProgram([file, shared], {
      jsx: ts.JsxEmit.Preserve,
      lib: ["lib.es2022.d.ts"],
      types: [],
      strict: true,
    });
    const linter = new Linter({ configType: "flat", cwd: root });
    return linter.verify(
      code,
      [
        {
          files: ["**/*.tsx"],
          languageOptions: { parser: tsParser, parserOptions: { programs: [program] } },
          plugins: {
            pasika: {
              rules: {
                "no-arbitrary-tailwind": noArbitraryTailwindRule,
                "no-styling-class-alias": noStylingClassAliasRule,
              },
            },
          },
          rules: { "pasika/no-arbitrary-tailwind": "error", "pasika/no-styling-class-alias": "error" },
        },
      ],
      { filename: file },
    );
  } finally {
    process.chdir(previous);
    rmSync(root, { recursive: true, force: true });
  }
}

test("traces imported helper returns through computed nested status maps without inspecting selector values", () => {
  const result = lint(
    'import { getStatusClasses, Status } from "./styles"; declare const status: Status; const element = <div className={getStatusClasses(status, "text")} />;',
    `export enum Status { Draft = "draft", Ready = "ready" }
const draft = "text-muted-ink";
const ready = "text-(--highlight)";
const map = { [Status.Draft]: { text: draft, border: "border-(--divider)" }, [Status.Ready]: { text: ready, border: "border-primary" } };
export function getStatusClasses(status: Status, property: "text" | "border") { const value = map[status][property]; return value; }`,
  );
  expect(result.map((item) => item.ruleId).sort((a, b) => (a ?? "").localeCompare(b ?? ""))).toEqual([
    "pasika/no-arbitrary-tailwind",
    "pasika/no-styling-class-alias",
  ]);
  expect(result.some((item) => item.message.includes("text-(--highlight)"))).toBe(true);
  expect(result.some((item) => item.message.includes("border-(--divider)"))).toBe(false);
  expect(result.some((item) => item.message.includes("handwritten lookup tables"))).toBe(true);
});

test("checks local raw aliases and rejects aliases in CVA variant values", () => {
  const result = lint(`import { cva as variants } from "class-variance-authority";
const raw = "border-(--divider)";
const valid = "text-muted-ink";
const style = variants(null, { variants: { status: { draft: valid, ready: raw } } });
const element = <div className={style({ status: "draft" })} />;`);
  expect(result.filter((item) => item.ruleId === "pasika/no-arbitrary-tailwind")).toHaveLength(1);
  expect(result.filter((item) => item.ruleId === "pasika/no-styling-class-alias")).toHaveLength(2);
});

test("leaves direct CVA variants, local static fragments, unrelated display data and shadowed helpers alone", () => {
  const result = lint(`import { cva } from "class-variance-authority";
const fragment = "text-muted-ink";
const examples = { label: "text-(--example)" };
const style = cva(null, { variants: { status: { draft: "border-divider", ready: "border-primary" } } });
function unrelated(cn: (value: string) => string) { return cn(examples.label); }
const element = <div className={fragment}>{examples.label}</div>;
const other = <div className={style({ status: "draft" })} />;`);
  expect(result).toEqual([]);
});

test("resolves declarations by identity rather than names and stops on recursive helpers", () => {
  const result = lint(`const fragment = "text-(--outside)";
function Card() { const fragment = "text-primary"; return <div className={fragment} />; }
function recursive(): string { return recursive(); }
const other = <div className={recursive()} />;`);
  expect(result).toEqual([]);
});

test("catches static indexed status choices and a sending class joined with a base style", () => {
  const result = lint(`import { cn } from "pasika/cn";
enum Status { Draft = "draft", Sending = "sending" }
const draftBorder = "border-(--divider)";
const sending = "animate-pulse";
const statusMap = { [Status.Draft]: { border: draftBorder }, [Status.Sending]: { border: "border-primary" } };
function getStatusClasses(status: Status) {
  const base = statusMap[status].border;
  return status === Status.Sending ? [base, sending].join(" ") : base;
}
const card = <div className={cn("rounded", getStatusClasses(Status.Draft))} />;`);
  expect(result.filter((item) => item.ruleId === "pasika/no-arbitrary-tailwind")).toHaveLength(1);
  expect(result.filter((item) => item.ruleId === "pasika/no-styling-class-alias")).toHaveLength(1);
});

test("rejects hidden two-way decisions but permits a helper that adds one standalone treatment", () => {
  const result = lint(`function choose(active: boolean) { return active ? "bg-primary" : "bg-danger"; }
function optional(active: boolean) { return active ? "animate-pulse" : ""; }
declare const active: boolean;
const card = <div className={choose(active)} />;
const indicator = <div className={optional(active)} />;`);
  expect(result.filter((item) => item.ruleId === "pasika/no-styling-class-alias")).toHaveLength(1);
});

test("follows named and namespace helper imports, compound variants, arrays and wrappers", () => {
  const result = lint(`import * as Variants from "class-variance-authority";
import { cn as combine } from "pasika/cn";
const raw = ("text-(--missing)" as const);
const variant = Variants.cva(null, { variants: { status: { draft: [raw], ready: "text-primary" } }, compoundVariants: [{ status: "draft", className: raw }] });
const fragment = ["border-divider", raw] as const;
const element = <div className={combine(...fragment)} />;`);
  expect(result.some((item) => item.ruleId === "pasika/no-arbitrary-tailwind")).toBe(true);
  expect(result.filter((item) => item.ruleId === "pasika/no-styling-class-alias")).toHaveLength(2);
});

test("checks spread class fragments without treating unrelated display values as classes", () => {
  const result = lint(`import { cn as combine } from "pasika/cn";
const fragment = ["border-divider", "text-(--missing)"] as const;
const display = "text-(--display)";
const element = <div className={combine(...fragment)}>{display}</div>;`);
  expect(result).toHaveLength(1);
  expect(result[0]?.message).toContain("text-(--missing)");
});
