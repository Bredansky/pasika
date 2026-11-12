import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { sharedClassReuses } from "./shared-class-compositions";
import { getProjectIndex } from "./index";

function project(fixtures: Record<string, string>): {
  sourceRoot: string;
  matches: ReturnType<typeof sharedClassReuses>;
} {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-shared-class-")));
  const sourceRoot = path.join(root, "src");
  for (const [name, code] of Object.entries(fixtures)) {
    const file = path.join(sourceRoot, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, code);
  }
  const index = getProjectIndex(sourceRoot);
  if (!index) throw new Error("Fixture project was not indexed");
  return { sourceRoot, matches: sharedClassReuses(index) };
}

test("Shared class contracts resolve renamed reexports, star barrels, clsx and module-level aliases.", () => {
  const { sourceRoot, matches } = project({
    "constants/surface.ts": `
      const color = "bg-mc-button text-white border-2";
      const size = "px-2 py-1 shadow-sm cursor-pointer";
      export const control = clsx(color, size);
    `,
    "constants/indirect.ts": 'export { control as minecraftControl } from "./surface";',
    "constants/index.ts": 'export * from "./indirect";',
    "constants/forward.ts": 'export { minecraftControl as styling } from "./index";',
    "features/minecraft/control.tsx":
      'import { styling } from "@/constants/forward"; export function Control() { return <button className={styling} />; }',
    "shared/minecraft-link.tsx":
      'import { minecraftControl as base } from "@/constants"; const alias = base; export function Link() { return <a className={cn(alias, "hover:bg-blue-500")} />; }',
    "shared/minecraft-card.tsx":
      'import { control } from "@/constants/surface"; export function Card() { return <article className={control} />; }',
    "shared/uses-as-title.tsx":
      'import { control } from "@/constants/surface"; export function Title() { return <p title={control} />; }',
    "shared/component-only.tsx":
      'import { control } from "@/constants/surface"; export function Wrapper() { return <Button className={control} />; }',
  });
  const link = path.join(sourceRoot, "shared/minecraft-link.tsx");
  const card = path.join(sourceRoot, "shared/minecraft-card.tsx");
  const first = path.join(sourceRoot, "features/minecraft/control.tsx");
  expect(matches.get(link)?.[0]?.occurrence.classes).toEqual([
    "bg-mc-button",
    "border-2",
    "cursor-pointer",
    "px-2",
    "py-1",
    "shadow-sm",
    "text-white",
  ]);
  expect(matches.get(card)).toHaveLength(1);
  expect(matches.get(first)).toBeUndefined();
  expect(matches.get(path.join(sourceRoot, "shared/uses-as-title.tsx"))).toBeUndefined();
  expect(matches.get(path.join(sourceRoot, "shared/component-only.tsx"))).toBeUndefined();
});

test("Dynamic compositions, cycles, and unresolved imports are ignored; short explicit shared contracts qualify.", () => {
  const { sourceRoot, matches } = project({
    "constants/broken.ts": `
      export const unknown = makeClasses();
      const loopA = loopB;
      const loopB = loopA;
      export { loopA as cyclic };
      export const short = "p-2 bg-red-500";
      export const object = { styles: "px-2 py-1 bg-red-500 border-2 shadow-sm" };
    `,
    "constants/cyclic-a.ts": 'export * from "./cyclic-b";',
    "constants/cyclic-b.ts": 'export * from "./cyclic-a";',
    "shared/a.tsx": `
      import { unknown, cyclic, short, object } from "@/constants/broken";
      import { absent } from "@/constants/cyclic-a";
      export function A() {
        return <><button className={unknown} /><a className={cyclic} /><nav className={short} />
          <main className={object.styles} /><footer className={absent} /></>;
      }
    `,
    "shared/b.tsx": `
      import { unknown, cyclic, short, object } from "@/constants/broken";
      import { absent } from "@/constants/cyclic-a";
      export function B() {
        return <><button className={unknown} /><a className={cyclic} /><nav className={short} />
          <main className={object.styles} /><footer className={absent} /></>;
      }
    `,
  });
  expect(matches.size).toBe(1);
  const shortReuse = matches.get(path.join(sourceRoot, "shared/b.tsx"));
  expect(shortReuse).toHaveLength(1);
  expect(shortReuse?.[0]?.occurrence.classes).toEqual(["bg-red-500", "p-2"]);
});

test("Parenthesized strings, no-substitution templates and local cn chains are resolved statically.", () => {
  const { sourceRoot, matches } = project({
    "constants/appearance.ts": `
      const base = ("px-2 py-1 border-2");
      const detail = \`rounded-md shadow-md\`;
      export const appearance = cn(base, detail);
    `,
    "shared/a.tsx":
      'import { appearance } from "@/constants/appearance"; export function First() { return <div className={appearance} />; }',
    "shared/b.tsx":
      'import { appearance } from "@/constants/appearance"; export function Second() { return <section className={clsx(appearance, "border-red-500")} />; }',
  });
  const found = matches.get(path.join(sourceRoot, "shared/b.tsx"));
  expect(found).toHaveLength(1);
  expect(found?.[0]?.occurrence.classes).toHaveLength(5);
});
