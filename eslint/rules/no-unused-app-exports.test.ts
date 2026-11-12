import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { noUnusedAppExportsRule } from "./no-unused-app-exports";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-unused-app-exports-")));
process.chdir(root);

function fixture(name: string, code: string): { filename: string; code: string } {
  const filename = path.join(root, "src", name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
}

const deadStyles = fixture(
  "compositions/donation-milestone.tsx",
  `export const donationMilestoneAmountLabelSizeClassName = "h-3 w-20";
export const donationMilestoneGoalValueSizeClassName = "h-5 w-28";
export const unusedNumber = 42;
export function DeadHelper() { return true; }
export class DeadClass {}
export enum DeadMode { Auto = "auto" }`,
);
const locallyUsed = fixture(
  "features/home/local.ts",
  "export const localValue = 1; export function Used() { return localValue; }",
);
fixture(
  "features/home/consumer.tsx",
  'import { Used } from "./local"; export function Consumer() { return <div>{Used()}</div>; }',
);
const usedImport = fixture("shared/value.ts", "export const usedValue = 42;");
fixture(
  "features/home/uses-value.tsx",
  'import { usedValue } from "@/shared/value"; export function UsesValue() { return <div>{usedValue}</div>; }',
);
const usedBarrel = fixture("shared/forwarded.ts", "export const forwarded = 123;");
fixture("shared/index.ts", 'export { forwarded } from "./forwarded";');
fixture(
  "features/home/uses-barrel.tsx",
  'import { forwarded } from "@/shared"; export function UsesBarrel() { return <div>{forwarded}</div>; }',
);
const typesAndSchemas = fixture(
  "features/home/types.ts",
  "export type Data = { id: number }; export interface State { ready: boolean }; export const dataSchema = {};",
);
const privateLocal = fixture("features/home/private.ts", "const unusedLocal = 1;");
const localTypeExport = fixture(
  "features/home/reexported-type.ts",
  "type LocalType = { value: string }; export { LocalType };",
);
const nextPage = fixture(
  "app/page.tsx",
  'export const metadata = { title: "Home" }; export default function Page() { return <div />; }',
);
const nextRoute = fixture("app/api/check/route.ts", "export async function GET() { return new Response('ok'); }");
const defaultExport = fixture(
  "features/home/default.tsx",
  "export default function UnusedDefault() { return <div />; }",
);
const testFile = fixture("features/home/test-helper.test.ts", "export const testHelper = 1;");
const deadAliased = fixture("features/home/aliased.ts", "const unused = 1; export { unused as aliased };");
const deadJs = fixture("features/home/dead.js", "export const unusedJavaScriptValue = true;");

const dead = (name: string): { message: string } => ({
  message: `Dead application export "${name}": it has no consumers. Remove it. See docs/next-codebase-guide/rules/dead-code-rule.md`,
});
const unused = (name: string): { message: string } => ({
  message: `Unused application export "${name}": it has no external consumers. Keep the declaration private. See docs/next-codebase-guide/rules/dead-code-rule.md`,
});

void describe("An internal application export with no consumers MUST be removed or kept private when locally used.", () => {
  ruleTester.run("no-unused-app-exports", noUnusedAppExportsRule, {
    valid: [
      usedImport,
      usedBarrel,
      typesAndSchemas,
      privateLocal,
      localTypeExport,
      nextPage,
      nextRoute,
      defaultExport,
      testFile,
    ],
    invalid: [
      {
        ...deadStyles,
        errors: [
          dead("donationMilestoneAmountLabelSizeClassName"),
          dead("donationMilestoneGoalValueSizeClassName"),
          dead("unusedNumber"),
          dead("DeadHelper"),
          dead("DeadClass"),
          dead("DeadMode"),
        ],
      },
      { ...locallyUsed, errors: [unused("localValue")] },
      { ...deadAliased, errors: [unused("aliased")] },
      { ...deadJs, errors: [dead("unusedJavaScriptValue")] },
    ],
  });
});
