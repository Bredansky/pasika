import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { enumPlacementRule } from "./enum-placement";
import { noMixedConcernsRule } from "./no-mixed-concerns";

const FIXTURE: Record<string, string> = {
  "shared/divider.tsx":
    'export enum DividerVariant { Stars = "Stars", Diamonds = "Diamonds" }; export type DividerProps = { variant?: DividerVariant }; export function Divider({ variant = DividerVariant.Stars }: DividerProps) { return <span>{variant}</span>; }',
  "app/divider/page.tsx":
    'import { Divider, DividerVariant } from "@/shared/divider"; export default function Page() { return <Divider variant={DividerVariant.Diamonds} />; }',

  "shared/divider-variant.test.ts":
    'import { Divider, DividerVariant } from "./divider"; export const values = [Divider, ...Object.values(DividerVariant)];',
  "shared/with-extracted.test.ts":
    'import { extractedVariant } from "@/constants"; export const observed = extractedVariant;',

  "features/home/constants/index.ts": 'export enum RetroCardSurface { Card = "card", Gradient = "gradient" }',
  "features/home/retro-card.tsx":
    'import { RetroCardSurface } from "./constants"; export function RetroCard() { return <div>{RetroCardSurface.Card}</div>; }',
  "features/home/support-section.tsx":
    'import { RetroCardSurface } from "./constants"; import { RetroCard } from "./retro-card"; export function SupportSection() { return <RetroCard />; }',
  "features/home/retro-card-surface.test.ts":
    'import { RetroCardSurface } from "./constants"; import { RetroCard } from "./retro-card"; export const surfaces = [RetroCard, ...Object.values(RetroCardSurface)];',
  "features/home/local-card.tsx":
    'export enum LocalCardSurface { Card = "card", Gradient = "gradient" }; export function LocalCard() { return <div>{LocalCardSurface.Card}</div>; }',
  "features/home/local-support.tsx":
    'import { LocalCardSurface, LocalCard } from "./local-card"; export function LocalSupport() { return <LocalCard />; }',
  "features/home/local-card.test.ts":
    'import { LocalCard, LocalCardSurface } from "./local-card"; export const surfaces = [LocalCard, ...Object.values(LocalCardSurface)];',

  "shared/test-owned-enum.tsx":
    'export enum TestOwnedVariant { A = "a", B = "b" }; export function TestOwned() { return <span />; }',
  "features/independent-enum.test.ts":
    'import { TestOwnedVariant } from "@/shared/test-owned-enum"; export const choice = TestOwnedVariant.A;',
  "shared/standalone.tsx":
    'export enum StandaloneVariant { A = "a", B = "b" }; export function Standalone() { return <span />; }',
  "features/unrelated.ts":
    'import { StandaloneVariant } from "@/shared/standalone"; export const choice = StandaloneVariant.A;',

  "shared/with-extracted.tsx":
    'import { extractedVariant } from "@/constants"; export function WithExtracted() { return <span>{extractedVariant}</span>; }',
  "constants/index.ts": 'export { extractedVariant } from "./extracted";',
  "constants/extracted.ts": 'export const extractedVariant = "Stars";',
  "app/with-extracted/page.tsx":
    'import { WithExtracted } from "@/shared/with-extracted"; import { extractedVariant } from "@/constants"; export default function Page() { return <WithExtracted />; }',

  "shared/test-harness.test.tsx":
    'import { fixtureSize } from "@/constants/fixtures"; function Harness() { return <span>{fixtureSize}</span>; }',
  "constants/fixtures.ts": "export const fixtureSize = 100;",
  "shared/fixture-reader.test.ts":
    'import { fixtureSize } from "@/constants/fixtures"; export const observed = fixtureSize;',
  "shared/form.tsx":
    'import { formSchema } from "@/schemas"; import type { FormState } from "@/types"; export function Form({ state }: { state?: FormState }) { return <form />; }',
  "schemas/index.ts": "export const formSchema = {};",
  "types/index.ts": "export type FormState = { value: string };",
  "app/form/page.tsx":
    'import { Form } from "@/shared/form"; import { formSchema } from "@/schemas"; import type { FormState } from "@/types"; export default function Page() { return <Form />; }',

  "shared/independent-value.tsx":
    'import { sharedValue } from "@/constants/shared"; export function IndependentValue() { return <span>{sharedValue}</span>; }',
  "constants/shared.ts": 'export const sharedValue = "used elsewhere";',
  "features/independent-reader.ts":
    'import { sharedValue } from "@/constants/shared"; export const value = sharedValue;',

  "features/merch/constants/page-values.ts": 'export const pageOnlyStats = [{ value: "42" }];',
  "app/merch/page.tsx":
    'import { pageOnlyStats } from "@/features/merch/constants/page-values"; export default function MerchPage() { return <main>{pageOnlyStats.length}</main>; }',
  "features/merch/constants/index.ts":
    'const products = [{ id: 1 }]; enum FilterType { All = "all", Clothing = "clothing" } export { products, FilterType };',
  "features/merch/merch-product-card.tsx":
    'import type { products } from "./constants"; export function MerchProductCard({ product }: { product: (typeof products)[number] }) { return <div>{product.id}</div>; }',
  "features/merch/merch-filter-button.tsx":
    'import { type FilterType } from "./constants"; export function MerchFilterButton({ value }: { value: FilterType }) { return <button>{value}</button>; }',

  "shared/owned-type.tsx":
    "export type OwnedProps = { active: boolean }; export function OwnedType({ active }: OwnedProps) { return <span>{active}</span>; }",
  "app/owned-type/page.tsx":
    'import { OwnedType, type OwnedProps } from "@/shared/owned-type"; export default function Page() { return <OwnedType active={true} />; }',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-component-owned-support-")));
for (const [name, code] of Object.entries(FIXTURE)) {
  const file = path.join(root, "src", name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, code);
}
process.chdir(root);
const fixture = (name: string): { code: string; filename: string } => ({
  code: FIXTURE[name] ?? "",
  filename: path.join(root, "src", name),
});

const doc = "See docs/next-codebase-guide/rules/no-mixed-concerns-rule.md";
const message = (kind: string, name: string, component: string): string =>
  `Supporting ${kind} "${name}" is consumed only with component "${component}". Define it in the component file; extract it into a support folder only when consumed independently. ${doc}`;

void describe("A constant, enum, type, or schema imported only by a component and consumers that also import the component MUST be defined in its `.tsx` file, not in a separate support module. Independently consumed values MUST remain in their matching `constants/`, `types/`, or `schemas/` folder.", () => {
  ruleTester.run("no-mixed-concerns:component-owned-support", noMixedConcernsRule, {
    valid: [
      fixture("shared/divider.tsx"),
      fixture("shared/with-extracted.tsx"),
      fixture("shared/test-harness.test.tsx"),
      fixture("shared/independent-value.tsx"),
      fixture("shared/owned-type.tsx"),
      fixture("features/merch/merch-product-card.tsx"),
      fixture("features/merch/merch-filter-button.tsx"),
      fixture("app/merch/page.tsx"),
    ],
    invalid: [
      {
        ...fixture("features/home/retro-card.tsx"),
        errors: [{ message: message("constant", "RetroCardSurface", "RetroCard") }],
      },
      {
        ...fixture("shared/form.tsx"),
        errors: [
          { message: message("schema", "formSchema", "Form") },
          { message: message("type", "FormState", "Form") },
        ],
      },
    ],
  });
});

void describe("An enum colocated with its component MUST NOT require extraction when every external consumer imports both.", () => {
  ruleTester.run("enum-placement:component-owned", enumPlacementRule, {
    valid: [fixture("shared/divider.tsx"), fixture("features/home/local-card.tsx")],
    invalid: [
      {
        ...fixture("shared/test-owned-enum.tsx"),
        errors: [
          {
            message:
              "An enum imported independently of its component must live in constants/ at its CCF; keep component-owned enums beside their component. See docs/next-codebase-guide/rules/constants-rule.md",
          },
        ],
      },
      {
        ...fixture("shared/standalone.tsx"),
        errors: [
          {
            message:
              "An enum imported independently of its component must live in constants/ at its CCF; keep component-owned enums beside their component. See docs/next-codebase-guide/rules/constants-rule.md",
          },
        ],
      },
    ],
  });
});
