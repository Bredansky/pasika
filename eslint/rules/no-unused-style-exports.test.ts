import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { noUnusedStyleExportsRule } from "./no-unused-style-exports";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-style-exports-")));
process.chdir(root);

function fixture(name: string, code: string): { filename: string; code: string } {
  const filename = path.join(root, "src", name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
}

const unused = fixture(
  "compositions/donation-milestone.tsx",
  `export const donationMilestoneAmountLabelSizeClassName = "h-3 w-20";
export const donationMilestoneAmountValueSizeClassName = "h-7 w-36";
export const donationMilestoneGoalLabelSizeClassName = "h-3 w-14";
export const donationMilestoneGoalValueSizeClassName = "h-5 w-28";
export function DonationMilestone() { return <div>Milestone</div>; }`,
);
const localUse = fixture(
  "features/home/local.tsx",
  'export const titleClassName = "h-3 w-20"; export function Local() { return <h2 className={titleClassName} />; }',
);
const usedImport = fixture("shared/surface.tsx", 'export const panelClassName = "rounded-md bg-card";');
fixture(
  "features/home/imported.tsx",
  'import { panelClassName as panel } from "@/shared/surface"; export function Imported() { return <div className={panel} />; }',
);
const usedBarrel = fixture("shared/canvas.tsx", 'export const canvasClassName = "px-2 py-1";');
fixture("shared/index.ts", 'export { canvasClassName } from "./canvas";');
fixture(
  "features/home/from-barrel.tsx",
  'import { canvasClassName } from "@/shared"; export function FromBarrel() { return <div className={canvasClassName} />; }',
);
const notStatic = fixture(
  "features/home/dynamic.tsx",
  'export const activeClassName = dynamicStyle(); export const url = "/go"; export function Dynamic() { return <div />; }',
);
const localNotExported = fixture(
  "features/home/private.tsx",
  'const unusedClassName = "h-3 w-20"; export function Private() { return <div />; }',
);
const usedByComponent = fixture(
  "features/home/helper.tsx",
  'export const helperClassName = cn("px-2", "py-1"); export function Helper() { return <div className={helperClassName} />; }',
);
const unusedCn = fixture(
  "features/home/dead-cn.tsx",
  'export const deadClassName = cn("h-3", "w-20"); export function Dead() { return <div />; }',
);
const tsSupport = fixture("constants/styles.ts", 'export const unusedClassName = "h-3 w-20";');
const tsxSupport = fixture("shared/styles.tsx", 'export const unusedClassName = "h-3 w-20";');

const issue = (name: string): { message: string } => ({
  message: `Unused exported styling constant "${name}" in an application component. Remove the export or consume the styling. See docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md`,
});

void describe("An unused exported static `*ClassName` constant in an application component MUST be removed.", () => {
  ruleTester.run("no-unused-style-exports", noUnusedStyleExportsRule, {
    valid: [localUse, usedImport, usedBarrel, notStatic, localNotExported, usedByComponent, tsSupport, tsxSupport],
    invalid: [
      {
        ...unused,
        errors: [
          issue("donationMilestoneAmountLabelSizeClassName"),
          issue("donationMilestoneAmountValueSizeClassName"),
          issue("donationMilestoneGoalLabelSizeClassName"),
          issue("donationMilestoneGoalValueSizeClassName"),
        ],
      },
      { ...unusedCn, errors: [issue("deadClassName")] },
    ],
  });
});
