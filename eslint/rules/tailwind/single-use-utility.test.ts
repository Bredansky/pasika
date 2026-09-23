import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { singleUseUtilityRule } from "./single-use-utility";

const GLOBALS = `@utility shared-surface { @apply rounded-xl bg-white; }
@utility card-header-rows { @apply grid-rows-2; }
@utility dead-surface { @apply bg-black; }
`;

const FIXTURE: Record<string, string> = {
  "globals.css": GLOBALS,
  "components/card-header.tsx":
    'export function CardHeader() { return <div className="card-header-rows shared-surface" />; }\\n',
  "components/card-footer.tsx": 'export function CardFooter() { return <div className="shared-surface" />; }\\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-single-use-utility-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);
const globalsPath = path.join(root, "src", "globals.css");

void describe("Styling used by only one component MUST stay in that component file as static Tailwind utility classes and MUST NOT be moved to the global stylesheet.", () => {
  tailwindRuleTester.run("single-use-utility", singleUseUtilityRule, {
    valid: [
      {
        code: `@utility shared-surface { @apply rounded-xl bg-white; }\n@utility dead-surface { @apply bg-black; }\n`,
        filename: globalsPath,
      },
    ],
    invalid: [
      {
        code: GLOBALS,
        filename: globalsPath,
        errors: [
          {
            message:
              'Custom utility "card-header-rows" is used by only one source file; keep that styling as static Tailwind classes in its consumer.',
          },
        ],
      },
    ],
  });
});
