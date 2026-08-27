import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { valueExtractionRule } from "./value-extraction";

/**
 * The rule reads the whole tree from disk, so the fixture is a real project.
 * Node runs each test file in its own process, which makes the `chdir` below
 * safe: the rule resolves its source root from the working directory.
 */
const FIXTURE: Record<string, string> = {
  // A value declared in src/app/ that a shared file imports independently.
  "app/pricing/limits.ts": "export const freeTierLimit = 10;\n",
  "shared/feature-gate.ts":
    'import { freeTierLimit } from "@/app/pricing/limits";\nexport const gate = freeTierLimit > 5;\n',

  // A framework file in src/app/ that nothing imports.
  "app/dashboard/page.tsx": "export default function Page() { return <div />; }\n",
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-value-extraction-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const DOC = "See docs/code-organization-guide/rules/constants-rule.md";

void describe(
  "A value MUST remain in its declaring component or file until another file imports it independently; it MUST then be extracted as a constant.",
  () => {
    ruleTester.run("value-extraction", valueExtractionRule, {
      valid: [
        {
          code: read("app/dashboard/page.tsx"),
          filename: file("app/dashboard/page.tsx"),
        },
      ],
      invalid: [
        {
          code: read("app/pricing/limits.ts"),
          filename: file("app/pricing/limits.ts"),
          errors: [
            {
            message:
              `This file in src/app/ is imported by src/shared/feature-gate.ts outside src/app/. Extract the value to a shared or feature folder so it can be imported independently. ${DOC}`,
            },
          ],
        },
      ],
    });
  },
);
