import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { noUnusedCvaOptionsRule } from "./no-unused-cva-options";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-cva-safety-")));
function fixture(name: string, code: string): { filename: string; code: string } {
  const filename = path.join(root, "src", name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
}

const shadowed = fixture(
  "shared/shadowed-button.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
const styles = cva("inline-flex", { variants: { tone: {
  primary: "bg-primary", secondary: "bg-secondary"
} } });
type Props = VariantProps<typeof styles>;
export function ShadowedButton({ tone }: Props): React.JSX.Element {
  return <button className={styles({ tone })} />;
}`,
);
fixture(
  "features/shadow/consumer.tsx",
  `import { ShadowedButton } from "@/shared/shadowed-button";
const tone = "primary";
export function Consumer({ tone }: { tone: "primary" | "secondary" }) {
  return <ShadowedButton tone={tone} />;
}`,
);

fixture("shared/tone-domain.ts", `export enum Tone { Primary = "primary", Secondary = "secondary" }`);
fixture("shared/tone-barrel.ts", `export { Tone as ChoiceTone } from "./tone-domain";`);
fixture("features/unrelated/other-tone.ts", `export enum ChoiceTone { Primary = "secondary", Secondary = "primary" }`);
const correctlyResolvedEnum = fixture(
  "shared/correct-enum-button.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
const styles = cva("inline-flex", { variants: { tone: {
  primary: "bg-primary", secondary: "bg-secondary"
} } });
type Props = VariantProps<typeof styles>;
export function CorrectEnumButton({ tone }: Props): React.JSX.Element {
  return <button className={styles({ tone })} />;
}`,
);
fixture(
  "features/enum/consumer.tsx",
  `import { CorrectEnumButton } from "@/shared/correct-enum-button";
import { ChoiceTone } from "@/shared/tone-barrel";
export function Consumer() { return <CorrectEnumButton tone={ChoiceTone.Primary} />; }`,
);

const localEnum = fixture(
  "shared/local-enum-button.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
enum LocalTone { Primary = "primary", Secondary = "secondary" }
const styles = cva("inline-flex", { variants: { tone: {
  [LocalTone.Primary]: "bg-primary", [LocalTone.Secondary]: "bg-secondary"
} }, defaultVariants: { tone: LocalTone.Primary } });
type Props = VariantProps<typeof styles>;
export function LocalEnumButton({ tone }: Props): React.JSX.Element {
  return <button className={styles({ tone })} />;
}`,
);
fixture(
  "features/local-enum/consumer.tsx",
  `import { LocalEnumButton } from "@/shared/local-enum-button";
export function Consumer() { return <LocalEnumButton />; }`,
);

const libraryRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-cva-library-")));
mkdirSync(path.join(libraryRoot, "src", "shared"), { recursive: true });
writeFileSync(
  path.join(libraryRoot, "package.json"),
  JSON.stringify({ name: "public-components", exports: { ".": "./dist/index.js" } }),
);
const publicCode = `import { cva, type VariantProps } from "class-variance-authority";
const styles = cva("inline-flex", { variants: { tone: { primary: "a", secondary: "b" } } });
type Props = VariantProps<typeof styles>;
export function PublicButton({ tone }: Props): React.JSX.Element {
  return <button className={styles({ tone })} />;
}
export function Showcase() { return <PublicButton tone="primary" />; }`;
const publicFile = path.join(libraryRoot, "src", "shared", "public-button.tsx");
writeFileSync(publicFile, publicCode);

void describe("Unused CVA checks MUST NOT infer static usage from shadowed bindings or external API consumers.", () => {
  process.chdir(root);
  ruleTester.run("no-unused-cva-options", noUnusedCvaOptionsRule, {
    valid: [shadowed],
    invalid: [
      {
        ...correctlyResolvedEnum,
        errors: [{ message: /Unused CVA option "tone=secondary"/ }],
      },
      {
        ...localEnum,
        errors: [{ message: /Unused CVA option "tone=secondary"/ }],
      },
    ],
  });
  process.chdir(libraryRoot);
  ruleTester.run("no-unused-cva-options-public-api", noUnusedCvaOptionsRule, {
    valid: [{ filename: publicFile, code: publicCode }],
    invalid: [],
  });
});
