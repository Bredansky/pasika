import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { noUnusedCvaOptionsRule } from "./no-unused-cva-options";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-cva-options-")));
process.chdir(root);
function fixture(name: string, code: string): { filename: string; code: string } {
  const filename = path.join(root, "src", name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
}

function component(name: string, config: string): string {
  return `import { cva, type VariantProps } from "class-variance-authority";
const styles = cva("inline-flex", ${config});
type Props = VariantProps<typeof styles>;
export function ${name}({ variant, size, tone }: Props): React.JSX.Element {
  return <button className={styles({ variant, size, tone })} />;
}`;
}

const skeleton = fixture(
  "shared/skeleton-button.tsx",
  component(
    "SkeletonButton",
    `{
  variants: {
    variant: { primary: "bg-primary", secondary: "bg-secondary", ghost: "" },
    size: { sm: "h-8", md: "h-10", lg: "h-14" }
  },
  defaultVariants: { variant: "secondary", size: "md" }
}`,
  ),
);
fixture(
  "features/home/milestone.tsx",
  `import { SkeletonButton } from "@/shared/skeleton-button";
const primarySelection = "primary";
const mediumSelection = "md";
export function Milestone() {
  return <><SkeletonButton variant={primarySelection} size={mediumSelection} /><SkeletonButton /></>;
}`,
);

fixture("shared/tone-domain.ts", `export enum Tone { Primary = "primary", Secondary = "secondary" }`);
const enumButton = fixture(
  "shared/enum-button.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
import { Tone } from "./tone-domain";
const styles = cva("inline-flex", { variants: {
  tone: { [Tone.Primary]: "bg-primary", [Tone.Secondary]: "bg-secondary" },
}, defaultVariants: { tone: Tone.Primary } });
type Props = VariantProps<typeof styles>;
export function EnumButton({ tone }: Props): React.JSX.Element {
  return <button className={styles({ tone })} />;
}`,
);
fixture(
  "features/tone/consumer.tsx",
  `import { EnumButton } from "@/shared/enum-button";
import { Tone } from "@/shared/tone-domain";
export function Consumer() { return <EnumButton tone={Tone.Primary} />; }`,
);

const fullyUsed = fixture(
  "shared/fully-used.tsx",
  component(
    "FullyUsed",
    `{
  variants: { tone: { primary: "bg-primary", secondary: "bg-secondary" } },
  defaultVariants: { tone: "secondary" }
}`,
  ),
);
fixture(
  "features/used/consumer.tsx",
  `import { FullyUsed } from "@/shared/fully-used";
export function Consumer() { return <><FullyUsed tone="primary" /><FullyUsed /></>; }`,
);

const dynamicButton = fixture(
  "shared/dynamic-button.tsx",
  component(
    "DynamicButton",
    `{
  variants: { tone: { primary: "bg-primary", secondary: "bg-secondary" } }
}`,
  ),
);
fixture(
  "features/dynamic/consumer.tsx",
  `import { DynamicButton } from "@/shared/dynamic-button";
export function Consumer({ tone }: { tone: string }) { return <DynamicButton tone={tone} />; }`,
);

const spreadButton = fixture(
  "shared/spread-button.tsx",
  component(
    "SpreadButton",
    `{
  variants: { tone: { primary: "bg-primary", secondary: "bg-secondary" } }
}`,
  ),
);
fixture(
  "features/spread/consumer.tsx",
  `import { SpreadButton } from "@/shared/spread-button";
export function Consumer({ props }: { props: object }) { return <SpreadButton {...props} />; }`,
);

const indirectButton = fixture(
  "shared/indirect-button.tsx",
  component(
    "IndirectButton",
    `{
  variants: { tone: { primary: "bg-primary", secondary: "bg-secondary" } }
}`,
  ),
);
fixture(
  "features/indirect/consumer.tsx",
  `import React from "react";
import { IndirectButton } from "@/shared/indirect-button";
export function Consumer({ props }: { props: object }) {
  return React.createElement(IndirectButton, props);
}`,
);

const defaultedBrand = fixture(
  "shared/defaulted-brand.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
export enum Brand { None = "none", YouTube = "youtube", Twitch = "twitch" }
const styles = cva("inline-flex", { variants: { brand: {
  [Brand.None]: "", [Brand.YouTube]: "from-youtube", [Brand.Twitch]: "from-twitch"
} } });
type Props = VariantProps<typeof styles>;
export function DefaultedBrand({ brand = Brand.None }: Props): React.JSX.Element {
  return <button className={styles({ brand })} />;
}`,
);
fixture(
  "features/defaulted/consumer.tsx",
  `import { DefaultedBrand, Brand } from "@/shared/defaulted-brand";
export function Consumer() {
  return <><DefaultedBrand /><DefaultedBrand brand={Brand.YouTube} /><DefaultedBrand brand={Brand.Twitch} /></>;
}`,
);

const booleanButton = fixture(
  "shared/boolean-button.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
const styles = cva("inline-flex", { variants: { enabled: { true: "opacity-100", false: "opacity-0" } } });
type Props = VariantProps<typeof styles>;
export function BooleanButton({ enabled }: Props): React.JSX.Element {
  return <button className={styles({ enabled })} />;
}`,
);
fixture(
  "features/boolean/consumer.tsx",
  `import { BooleanButton } from "@/shared/boolean-button";
export function Consumer() { return <><BooleanButton enabled /><BooleanButton enabled={false} /></>; }`,
);

const unknownDefault = fixture(
  "shared/unknown-default.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
declare const runtimeDefault: "primary" | "secondary";
const styles = cva("inline-flex", { variants: { tone: { primary: "a", secondary: "b" } },
  defaultVariants: { tone: runtimeDefault } });
type Props = VariantProps<typeof styles>;
export function UnknownDefault({ tone }: Props): React.JSX.Element {
  return <button className={styles({ tone })} />;
}`,
);
fixture(
  "features/unknown-default/consumer.tsx",
  `import { UnknownDefault } from "@/shared/unknown-default";
export function Consumer() { return <UnknownDefault />; }`,
);

const arrowDefault = fixture(
  "shared/arrow-default.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
const styles = cva("inline-flex", { variants: { tone: { primary: "a", secondary: "b" } } });
type Props = VariantProps<typeof styles>;
export const ArrowDefault = ({ tone = "primary" }: Props): React.JSX.Element =>
  <button className={styles({ tone })} />;`,
);
fixture(
  "features/arrow-default/consumer.tsx",
  `import { ArrowDefault } from "@/shared/arrow-default";
export function Consumer() { return <><ArrowDefault /><ArrowDefault tone="secondary" /></>; }`,
);

const namespaceButton = fixture(
  "shared/namespace-button.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
const styles = cva("inline-flex", { variants: { tone: { primary: "a", secondary: "b" } } });
type Props = VariantProps<typeof styles>;
export function NamespaceButton({ tone }: Props): React.JSX.Element {
  return <button className={styles({ tone })} />;
}`,
);
fixture(
  "features/namespace/consumer.tsx",
  `import * as Buttons from "@/shared/namespace-button";
export function Consumer() { return <Buttons.NamespaceButton tone="primary" />; }`,
);

const separateFactory = fixture(
  "shared/separate-factory.tsx",
  `import { cva, type VariantProps } from "class-variance-authority";
export const styles = cva("inline-flex", { variants: { tone: { primary: "a", secondary: "b" } } });
type Props = VariantProps<typeof styles>;
export function SeparateFactory({ tone }: Props): React.JSX.Element {
  return <button className={styles({ tone })} />;
}`,
);
fixture(
  "features/separate-factory/consumer.tsx",
  `import { SeparateFactory, styles } from "@/shared/separate-factory";
export function Consumer() { return <SeparateFactory tone="primary" className={styles({ tone: "secondary" })} />; }`,
);

const noConsumers = fixture(
  "shared/no-consumers.tsx",
  component(
    "NoConsumers",
    `{
  variants: { tone: { primary: "bg-primary", secondary: "bg-secondary" } }
}`,
  ),
);

const conditionalButton = fixture(
  "shared/conditional-button.tsx",
  component(
    "ConditionalButton",
    `{
  variants: { tone: { primary: "bg-primary", secondary: "bg-secondary" } }
}`,
  ),
);
fixture(
  "features/conditional/consumer.tsx",
  `import { ConditionalButton } from "@/shared/conditional-button";
export function Consumer({ active }: { active: boolean }) {
  return <ConditionalButton tone={active ? "primary" : "secondary"} />;
}`,
);

void describe("A statically unused CVA choice MUST NOT remain in an application component.", () => {
  ruleTester.run("no-unused-cva-options", noUnusedCvaOptionsRule, {
    valid: [
      fullyUsed,
      defaultedBrand,
      booleanButton,
      unknownDefault,
      arrowDefault,
      namespaceButton,
      separateFactory,
      dynamicButton,
      spreadButton,
      indirectButton,
      noConsumers,
      conditionalButton,
    ],
    invalid: [
      {
        ...skeleton,
        errors: [
          { message: /Unused CVA option "variant=ghost"/ },
          { message: /Unused CVA option "size=sm"/ },
          { message: /Unused CVA option "size=lg"/ },
        ],
      },
      {
        ...enumButton,
        errors: [{ message: /Unused CVA option "tone=secondary"/ }],
      },
    ],
  });
});
