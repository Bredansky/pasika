import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { getJsxReuseAnalysis } from "../project/jsx-class-reuse";
import { describe, ruleTester } from "../rule-tester";
import { noDuplicateJsxClassesRule } from "./no-duplicate-jsx-classes";

const examples: Record<string, string> = {
  "a-equal.tsx": '<div className="equal-a equal-b equal-c equal-d equal-e"><span>One</span></div>',
  "b-equal.tsx": '<div title="different" className="equal-e equal-b equal-c equal-a equal-d"><p>Two</p></div>',
  "c-equal.tsx": '<div className={cn("equal-a equal-c", "equal-b equal-e equal-d")} />',
  "d-equal.tsx": '<div className="equal-a equal-b equal-c equal-d equal-e" onClick={onClick} />',
  "a-layout.tsx": '<main className="absolute inset-0 flex items-center justify-center" />',
  "b-layout.tsx": '<main className="justify-center flex inset-0 absolute items-center" />',
  "a-six.tsx": '<section className="six-a six-b six-c six-d six-e six-f" />',
  "b-six.tsx": '<section className="six-f six-e six-d six-c six-b six-a" />',
  "a-eleven.tsx":
    '<header className="eleven-a eleven-b eleven-c eleven-d eleven-e eleven-f eleven-g eleven-h eleven-i eleven-j eleven-k" />',
  "b-eleven.tsx":
    '<header className="eleven-k eleven-j eleven-i eleven-h eleven-g eleven-f eleven-e eleven-d eleven-c eleven-b eleven-a" />',
  "a-whitespace.tsx": '<h2 className="white-a  white-b white-c   white-d white-e white-e">One</h2>',
  "b-whitespace.tsx": '<h2 className="white-e white-d white-c white-b white-a">Two</h2>',
  "a-extra.tsx": '<aside className="extra-a extra-b extra-c extra-d extra-e" />',
  "b-extra.tsx": '<aside className="extra-a extra-b extra-c extra-d extra-e extra-f" />',
  "a-replace.tsx": '<article className="replace-a replace-b replace-c replace-d replace-e replace-f" />',
  "b-replace.tsx": '<article className="replace-a replace-b replace-c replace-d replace-e replace-g" />',
  "a-partial-long.tsx":
    '<footer className="partial-a partial-b partial-c partial-d partial-e partial-f partial-g partial-h partial-i partial-j partial-k" />',
  "b-partial-long.tsx":
    '<footer className="partial-a partial-b partial-c partial-d partial-e partial-l partial-m partial-n partial-o partial-p partial-q" />',
  "a-four.tsx": '<nav className="four-a four-b four-c four-d" />',
  "b-four.tsx": '<nav className="four-d four-c four-b four-a" />',
  "a-dynamic.tsx": '<table className={cn("dynamic-a dynamic-b dynamic-c dynamic-d dynamic-e", variable)} />',
  "b-dynamic.tsx": '<table className="dynamic-a dynamic-b dynamic-c dynamic-d dynamic-e" />',
  "a-tag.tsx": '<div className="tag-a tag-b tag-c tag-d tag-e" />',
  "b-tag.tsx": '<article className="tag-e tag-d tag-c tag-b tag-a" />',
  "a-component.tsx": '<Button className="component-a component-b component-c component-d component-e" />',
  "b-component.tsx": '<Button className="component-a component-b component-c component-d component-e" />',
  "a-local.tsx":
    '<><label className="local-a local-b local-c local-d local-e" /><label className="local-e local-d local-c local-b local-a" /></>',
  "a-cn-extra.tsx":
    '<summary className={cn("cn-extra-a cn-extra-b cn-extra-c cn-extra-d cn-extra-e", "cn-extra-f")} />',
  "b-cn-extra.tsx": '<summary className="cn-extra-a cn-extra-b cn-extra-c cn-extra-d cn-extra-e" />',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-jsx-style-reuse-")));
for (const [name, code] of Object.entries(examples)) {
  const file = path.join(root, "src", "features", "examples", name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, code);
}
const sharedClasses: Record<string, string> = {
  "constants/control-classes.ts":
    'import { cn } from "pasika/cn"; const surface = "border-2 bg-mc-button p-2 shadow-mc text-sm"; const behavior = "cursor-pointer hover:bg-mc-button-hover focus-visible:ring-2"; export const minecraftControlClassName = cn(surface, behavior);',
  "constants/index.ts": 'export { minecraftControlClassName } from "./control-classes";',
  "features/showcase/minecraft-button.tsx":
    'import { minecraftControlClassName } from "@/constants"; export function MinecraftButton({ className }: { className?: string }) { return <button className={cn(minecraftControlClassName, "text-sm", className)} />; }',
  "shared/minecraft-link.tsx":
    'import { minecraftControlClassName as buttonClasses } from "@/constants"; export function MinecraftLink({ className, compact }: { className?: string; compact?: boolean }) { return <a className={cn(buttonClasses, compact ? "text-xs" : "text-sm", className)} />; }',
  "constants/one-off.ts": 'export const oneOffClasses = "border-2 bg-card p-2 shadow-card text-sm";',
  "shared/one-off.tsx":
    'import { oneOffClasses } from "@/constants/one-off"; export function OneOff() { return <article className={oneOffClasses} />; }',
  "shared/non-style-use.tsx":
    'import { minecraftControlClassName } from "@/constants"; export function Label() { return <p title={minecraftControlClassName} />; }',
  "shared/custom-component.tsx":
    'import { minecraftControlClassName } from "@/constants"; export function Wrapper() { return <Button className={minecraftControlClassName} />; }',
  "shared/local-classes.tsx":
    'export function Local() { const localClasses = "p-2 bg-green-500 border-2 rounded-md shadow-md"; return <div className={localClasses} />; }',
};
for (const [name, code] of Object.entries(sharedClasses)) {
  const file = path.join(root, "src", name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, code);
}

process.chdir(root);

function fixture(name: string): { code: string; filename: string } {
  return {
    code: examples[name] ?? "",
    filename: path.join(root, "src", "features", "examples", name),
  };
}

function sharedFixture(name: string): { code: string; filename: string } {
  return { code: sharedClasses[name] ?? "", filename: path.join(root, "src", name) };
}

function message(tag: string, amount: number, reference: string): string {
  return `<${tag}> repeats the same set of ${String(amount)} classes as src/features/examples/${reference}:1. Extract a shared component. See docs/next-codebase-guide/rules/component-style-reuse-rule.md`;
}

void describe("Native JSX elements in different source files MUST share a component when they either have the same tag and identical static sets of at least five classes or use the same exported static class set of at least five classes.", () => {
  ruleTester.run("no-duplicate-jsx-classes", noDuplicateJsxClassesRule, {
    valid: [
      "a-equal.tsx",
      "a-layout.tsx",
      "a-six.tsx",
      "a-eleven.tsx",
      "a-whitespace.tsx",
      "a-extra.tsx",
      "b-extra.tsx",
      "a-replace.tsx",
      "b-replace.tsx",
      "a-partial-long.tsx",
      "b-partial-long.tsx",
      "a-four.tsx",
      "b-four.tsx",
      "a-dynamic.tsx",
      "b-dynamic.tsx",
      "a-tag.tsx",
      "b-tag.tsx",
      "a-component.tsx",
      "b-component.tsx",
      "a-local.tsx",
      "a-cn-extra.tsx",
      "b-cn-extra.tsx",
    ].map(fixture),
    invalid: [
      { ...fixture("b-equal.tsx"), errors: [{ message: message("div", 5, "a-equal.tsx") }] },
      { ...fixture("c-equal.tsx"), errors: [{ message: message("div", 5, "a-equal.tsx") }] },
      { ...fixture("d-equal.tsx"), errors: [{ message: message("div", 5, "a-equal.tsx") }] },
      { ...fixture("b-layout.tsx"), errors: [{ message: message("main", 5, "a-layout.tsx") }] },
      { ...fixture("b-six.tsx"), errors: [{ message: message("section", 6, "a-six.tsx") }] },
      { ...fixture("b-eleven.tsx"), errors: [{ message: message("header", 11, "a-eleven.tsx") }] },
      { ...fixture("b-whitespace.tsx"), errors: [{ message: message("h2", 5, "a-whitespace.tsx") }] },
    ],
  });
});

test("Only complete class-set equality forms a cross-file group, including classes from cn() and layout utilities.", () => {
  const analysis = getJsxReuseAnalysis(root);
  expect(analysis.groups).toHaveLength(5);
  expect(analysis.groups.find((group) => group.tag === "div")?.members).toHaveLength(4);
  expect(analysis.groups.find((group) => group.tag === "header")?.commonClasses).toHaveLength(11);
  expect(analysis.groups.find((group) => group.tag === "main")?.commonClasses).toHaveLength(5);
  expect([...analysis.matches.values()].flat()).toHaveLength(7);
});

test("Adding or replacing even one class cannot form a reuse group.", () => {
  const grouped = new Set(
    getJsxReuseAnalysis(root).groups.flatMap((group) => group.members.map((member) => member.file)),
  );
  for (const name of ["b-extra.tsx", "b-replace.tsx", "b-partial-long.tsx", "b-cn-extra.tsx", "b-four.tsx"]) {
    expect(grouped.has(fixture(name).filename)).toBe(false);
  }
});

void describe("Exported class compositions are detected across different native elements even when the styling is imported through a barrel.", () => {
  ruleTester.run("no-duplicate-jsx-classes:shared-constants", noDuplicateJsxClassesRule, {
    valid: [
      sharedFixture("features/showcase/minecraft-button.tsx"),
      sharedFixture("shared/one-off.tsx"),
      sharedFixture("shared/non-style-use.tsx"),
      sharedFixture("shared/custom-component.tsx"),
      sharedFixture("shared/local-classes.tsx"),
    ],
    invalid: [
      {
        ...sharedFixture("shared/minecraft-link.tsx"),
        errors: [
          {
            message:
              '<a> reuses exported class composition "minecraftControlClassName" (8 classes) from src/features/showcase/minecraft-button.tsx:1. Extract a shared component. See docs/next-codebase-guide/rules/component-style-reuse-rule.md',
          },
        ],
      },
    ],
  });
});

test("Shared class compositions follow a barrel, aliases, local cn() values and dynamic consumer variants.", () => {
  const shared = getJsxReuseAnalysis(path.join(root, "src")).shared;
  expect(shared.get(sharedFixture("shared/minecraft-link.tsx").filename)).toHaveLength(1);
  expect(shared.get(sharedFixture("features/showcase/minecraft-button.tsx").filename)).toBeUndefined();
  for (const name of [
    "shared/one-off.tsx",
    "shared/non-style-use.tsx",
    "shared/custom-component.tsx",
    "shared/local-classes.tsx",
  ]) {
    expect(shared.get(sharedFixture(name).filename)).toBeUndefined();
  }
});
