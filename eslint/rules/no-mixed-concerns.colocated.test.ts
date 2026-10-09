import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { noMixedConcernsRule } from "./no-mixed-concerns";

const FIXTURE: Record<string, string> = {
  "features/ui/badge.tsx":
    'const badgeVariants = cva("inline-flex");\nfunction Badge() { return <span />; }\nexport { Badge, badgeVariants };\n',
  "features/ui/badge-consumer.tsx":
    'import { Badge, badgeVariants } from "./badge";\nexport function BadgeConsumer() { return <Badge />; }\n',
  "features/ui/chip.tsx": 'export const chipVariants = cva("flex");\nexport function Chip() { return <span />; }\n',
  "features/ui/chip-consumer.ts": 'import { chipVariants } from "./chip";\nexport const classes = chipVariants;\n',
  "features/ui/controls.tsx":
    'export function Controls() { return <div />; }\nexport { controlSize } from "./constants";\n',
  "features/ui/constants.ts": 'export const controlSize = "large";\n',
  "features/ui/controls-consumer.tsx":
    'import { Controls, controlSize } from "./controls";\nexport function ControlsConsumer() { return <Controls />; }\n',
  "features/ui/parent.tsx": 'export function Parent() { return <div />; }\nexport { Child } from "./child";\n',
  "features/ui/child.tsx": "export function Child() { return <span />; }\n",
  "features/ui/parent-consumer.tsx":
    'import { Parent } from "./parent";\nexport function ParentConsumer() { return <Parent />; }\n',
  "features/ui/helper.tsx":
    "function Helper() { return <span />; }\nconst helperValue = 10;\nexport { Helper, helperValue };\n",
  "features/ui/helper-consumer.tsx":
    'import { helperValue as size } from "./helper";\nexport function HelperConsumer() { return <div>{size}</div>; }\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-component-colocated-exports-")));
for (const [relative, contents] of Object.entries(FIXTURE)) {
  const file = path.join(root, "src", relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
}
process.chdir(root);
const filename = (relative: string): string => path.join(root, "src", relative);
const code = (relative: string): string => FIXTURE[relative] ?? "";

void describe("A supporting non-component export from a component MAY stay in its .tsx file when every consumer also imports the component.", () => {
  ruleTester.run("no-mixed-concerns", noMixedConcernsRule, {
    valid: [
      { filename: filename("features/ui/badge.tsx"), code: code("features/ui/badge.tsx") },
      { filename: filename("features/ui/controls.tsx"), code: code("features/ui/controls.tsx") },
    ],
    invalid: [
      {
        filename: filename("features/ui/chip.tsx"),
        code: code("features/ui/chip.tsx"),
        errors: [
          {
            message:
              'Supporting export "chipVariants" is imported without its component "Chip". Import them together or extract the supporting value to its appropriate module. See docs/next-codebase-guide/rules/no-mixed-concerns-rule.md',
          },
        ],
      },
      {
        filename: filename("features/ui/helper.tsx"),
        code: code("features/ui/helper.tsx"),
        errors: 1,
      },
    ],
  });
});

void describe("A component .tsx file MUST NOT re-export another component.", () => {
  ruleTester.run("no-mixed-concerns", noMixedConcernsRule, {
    valid: [{ filename: filename("features/ui/controls.tsx"), code: code("features/ui/controls.tsx") }],
    invalid: [
      {
        filename: filename("features/ui/parent.tsx"),
        code: code("features/ui/parent.tsx"),
        errors: [
          {
            message:
              'Component file "Parent" must not re-export another component "Child". Import that component directly.',
          },
        ],
      },
    ],
  });
});
