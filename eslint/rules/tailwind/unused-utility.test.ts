import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { unusedUtilityRule } from "./unused-utility";

/**
 * The rule scans the src/ tree from disk, so the fixture is a real project.
 * Node runs each test file in its own process, which makes the `chdir` below
 * safe.
 */
const GLOBALS = `@utility primary-surface { @apply bg-(--primary-canvas); }
@utility secondary-surface { @apply bg-(--secondary-canvas); }
@utility dead-surface { @apply bg-(--dead-canvas); }
@utility primary { @apply px-1; }
`;

const FIXTURE: Record<string, string> = {
  "globals.css": GLOBALS,
  // `primary-surface` is referenced; `primary` appears only as a substring of
  // it and must not count as used.
  "components/button.tsx": 'export function Button() { return <div className="primary-surface" />; }\n',
  // `secondary-surface` is referenced from another stylesheet via @apply.
  "styles/overrides.css": "/* applied elsewhere */\n@apply secondary-surface;\n",
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-unused-utility-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const globalsPath = path.join(root, "src", "globals.css");

void describe("A custom utility MUST be used by at least one file in the repository's source.", () => {
  tailwindRuleTester.run("unused-utility", unusedUtilityRule, {
    valid: [
      // Only the referenced utilities are defined here.
      {
        code: GLOBALS.replace(/@utility dead-surface \{ @apply bg-\(--dead-canvas\); \}\n/, "").replace(
          /@utility primary \{ @apply px-1; \}\n/,
          "",
        ),
        filename: globalsPath,
      },
    ],
    invalid: [
      {
        code: GLOBALS,
        filename: globalsPath,
        errors: [
          { message: 'Custom utility "dead-surface" is never used by the repository\'s source; remove it or use it.' },
          { message: 'Custom utility "primary" is never used by the repository\'s source; remove it or use it.' },
        ],
      },
    ],
  });
});
