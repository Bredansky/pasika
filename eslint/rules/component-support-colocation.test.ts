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
    valid: [fixture("shared/divider.tsx"), fixture("shared/independent-value.tsx"), fixture("shared/owned-type.tsx")],
    invalid: [
      {
        ...fixture("shared/with-extracted.tsx"),
        errors: [{ message: message("constant", "extractedVariant", "WithExtracted") }],
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
    valid: [fixture("shared/divider.tsx")],
    invalid: [
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
