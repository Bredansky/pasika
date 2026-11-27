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

test("traces arbitrary classes through imported lookup helpers without confusing unrelated map entries", () => {
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

test("rejects class aliases in CVA variant values", () => {
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

test("Components MUST define alternative visual treatments using CVA with directly specified Tailwind classes instead of class-name aliases, handwritten lookup tables, or custom class-returning helpers.", () => {
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

test("resolves shorthand and spread object values while ignoring unrelated members", () => {
  const result = lint(`const text = "text-(--missing)";
const base = { text, unrelated: "bg-(--unused)" };
const styles = { ...base, border: "border-divider" };
const element = <div className={styles.text} />;`);
  expect(result).toHaveLength(1);
  expect(result[0]?.message).toContain("text-(--missing)");
});

test("resolves default arguments, concise helper bodies, and array projections", () => {
  const result = lint(`const values = ["text-primary", "text-(--missing)"] as const;
const choose = (index = 1) => values[index];
const element = <div className={choose(1)} />;`);
  expect(result.some((item) => item.message.includes("text-(--missing)"))).toBe(true);
  expect(result.some((item) => item.ruleId === "pasika/no-styling-class-alias")).toBe(false);
  const defaultResult = lint(`const choose = (value = "text-(--default)") => value;
const element = <div className={choose()} />;`);
  expect(defaultResult.some((item) => item.message.includes("text-(--default)"))).toBe(true);
});

test("checks conditional class object keys and fractional aliases through default and namespace imports", () => {
  const result = lint(`import compose from "clsx";
import * as Merge from "tailwind-merge";
declare const enabled: boolean;
const raw = "text-(--missing)";
const keys = { [raw]: enabled, "h-3.5": enabled };
const element = <div className={compose(keys)} />;
const space = "gap-2.5";
const other = <div className={Merge.twMerge(space)} />;`);
  expect(result.some((item) => item.message.includes("text-(--missing)"))).toBe(true);
  expect(result.some((item) => item.message.includes("h-3.5"))).toBe(true);
  expect(result.some((item) => item.message.includes("gap-2.5"))).toBe(true);
});

test("traces enum members and logical fallback values without scanning conditions", () => {
  const result = lint(`enum Example { Raw = "text-(--enum)" }
declare const condition: boolean;
const fallback = "border-(--fallback)";
const selected = condition && Example.Raw;
const element = <div className={selected || fallback} />;`);
  expect(result.some((item) => item.message.includes("text-(--enum)"))).toBe(true);
  expect(result.some((item) => item.message.includes("border-(--fallback)"))).toBe(true);
});
