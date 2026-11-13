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
  expect(matches.get(path.join(sourceRoot, "shared/component-only.tsx"))).toHaveLength(1);
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
  expect(shortReuse).toHaveLength(2);
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

test("Indexed class maps reused by a styled component and its skeleton are reported.", () => {
  const { sourceRoot, matches } = project({
    "constants/retro-button-domain.ts": `
      export enum RetroButtonVariant { Primary = "primary", Secondary = "secondary" }
    `,
    "constants/retro-button-classes.ts": `
      enum RetroButtonBackground {
        Primary = "bg-gradient-to-r from-primary to-accent",
        Secondary = "bg-secondary",
      }
      export const retroButtonBackgroundClassNames = {
        primary: RetroButtonBackground.Primary,
        secondary: RetroButtonBackground.Secondary,
      } satisfies Record<string, string>;
    `,
    "constants/index.ts": `
      export { RetroButtonVariant } from "./retro-button-domain";
      export { retroButtonBackgroundClassNames } from "./retro-button-classes";
    `,
    "shared/retro-button.tsx": `
      import { retroButtonBackgroundClassNames } from "../constants";
      const { primary, secondary } = retroButtonBackgroundClassNames;
      const variants = cva("inline-flex", {
        variants: { variant: {
          primary: cn(primary, "border-4 text-white"),
          secondary: cn(secondary, "border-2 text-black"),
        } },
      });
      export function RetroButton() { return <Comp className={cn(variants({ variant: "primary" }))} />; }
    `,
    "features/home/retro-button-skeleton.tsx": `
      import { retroButtonBackgroundClassNames, RetroButtonVariant } from "@/constants";
      export function RetroButtonSkeleton() {
        return <Skeleton className={cn(retroButtonBackgroundClassNames[RetroButtonVariant.Primary], "h-10")} />;
      }
    `,
  });
  const reuse = matches.get(path.join(sourceRoot, "shared/retro-button.tsx"));
  expect(reuse).toHaveLength(1);
  expect(reuse?.[0]?.occurrence.tag).toBe("cn()");
  expect(reuse?.[0]?.original.tag).toBe("Skeleton");
  expect(reuse?.[0]?.occurrence.symbol).toContain("retroButtonBackgroundClassNames.primary");
  expect(reuse?.[0]?.occurrence.classes).toEqual(["bg-gradient-to-r", "from-primary", "to-accent"]);
});

test("Different entries, computed dynamic keys, and non-style uses are not conflated.", () => {
  const { sourceRoot, matches } = project({
    "constants/button.ts": `export const classes = {
      primary: "bg-blue-500 text-white border-2",
      secondary: "bg-gray-500 text-black border-2",
    };`,
    "shared/primary.tsx": `import { classes } from "@/constants/button";
      export function Primary() { return <Card className={classes.primary} />; }`,
    "shared/secondary.tsx": `import { classes } from "@/constants/button";
      export function Secondary() { return <Card className={classes.secondary} />; }`,
    "shared/dynamic.tsx": `import { classes } from "@/constants/button";
      export function Dynamic({ variant }: { variant: string }) {
        return <Card className={classes[variant as keyof typeof classes]} />;
      }`,
    "shared/non-style.tsx": `import { classes } from "@/constants/button";
      export function Meta() { return <span title={classes.primary} />; }`,
  });
  for (const name of ["primary", "secondary", "dynamic", "non-style"]) {
    expect(matches.get(path.join(sourceRoot, `shared/${name}.tsx`))).toBeUndefined();
  }
});

test("Computed map keys and enum reexports resolve to the same static style contract.", () => {
  const { sourceRoot, matches } = project({
    "constants/domain.ts": 'export enum Variant { Primary = "primary", Secondary = "secondary" }',
    "constants/bridge.ts": 'export { Variant as ButtonVariant } from "./domain";',
    "constants/styles.ts": `
      import { Variant } from "./domain";
      export const appearance = {
        [Variant.Primary]: "bg-blue-500 text-white border-2 shadow-md",
        [Variant.Secondary]: "bg-gray-500 text-black border-2 shadow-md",
      } as const;
    `,
    "constants/index.ts": 'export * from "./bridge"; export * from "./styles";',
    "shared/a.tsx": `
      import { appearance, ButtonVariant } from "@/constants";
      export function First() {
        return <Button className={appearance[ButtonVariant.Primary]} />;
      }
    `,
    "shared/b.tsx": `
      import { appearance, ButtonVariant } from "@/constants";
      const alias = appearance;
      export function Second() {
        return <Skeleton className={alias[ButtonVariant.Primary]} />;
      }
    `,
    "shared/secondary.tsx": `
      import { appearance, ButtonVariant } from "@/constants";
      export function Secondary() {
        return <Skeleton className={appearance[ButtonVariant.Secondary]} />;
      }
    `,
  });
  const result = matches.get(path.join(sourceRoot, "shared/b.tsx"));
  expect(result).toHaveLength(1);
  expect(result?.[0]?.occurrence.symbol).toContain("appearance.primary");
  expect(result?.[0]?.occurrence.classes).toEqual(["bg-blue-500", "border-2", "shadow-md", "text-white"]);
  expect(matches.get(path.join(sourceRoot, "shared/secondary.tsx"))).toBeUndefined();
});

test("Destructured map members and shorthand properties are traced through class compositions.", () => {
  const { sourceRoot, matches } = project({
    "constants/appearance.ts": `
      const primary = "bg-blue-500 px-2 py-1";
      const styles = { primary };
      const { primary: selected } = styles;
      export const decorated = clsx(selected, "shadow-sm");
    `,
    "shared/first.tsx":
      'import { decorated } from "@/constants/appearance"; export const First = () => <Button className={decorated} />;',
    "shared/second.tsx":
      'import { decorated } from "@/constants/appearance"; export const Second = () => <Skeleton className={cn(decorated, "h-10")} />;',
  });
  const result = matches.get(path.join(sourceRoot, "shared/second.tsx"));
  expect(result).toHaveLength(1);
  expect(result?.[0]?.occurrence.classes).toEqual(["bg-blue-500", "px-2", "py-1", "shadow-sm"]);
});

test("Parenthesized aliases, string property names and unresolved class-map keys remain safe.", () => {
  const { sourceRoot, matches } = project({
    "constants/appearance.ts": `
      const source = { "primary": "bg-red-500 border-2 p-4", "secondary": "bg-blue-500 border-2 p-4" };
      export const styles = (source satisfies Record<string, string>);
      export const broken = { missing: makeClasses() };
    `,
    "shared/first.tsx":
      'import { styles } from "@/constants/appearance"; export const First = () => <Card className={styles.primary} />;',
    "shared/second.tsx":
      'import { styles } from "@/constants/appearance"; export const Second = () => <Card className={styles["primary"]} />;',
    "shared/dynamic.tsx":
      'import { styles, broken } from "@/constants/appearance"; export const Dynamic = ({ keyName }: { keyName: string }) => <Card className={cn(styles[keyName], broken.missing)} />;',
  });
  const result = matches.get(path.join(sourceRoot, "shared/second.tsx"));
  expect(result).toHaveLength(1);
  expect(result?.[0]?.occurrence.classes).toEqual(["bg-red-500", "border-2", "p-4"]);
  expect(matches.get(path.join(sourceRoot, "shared/dynamic.tsx"))).toBeUndefined();
});
