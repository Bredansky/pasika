import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { configExtractionRule } from "./config-extraction";

/**
 * The rule reads the whole tree from disk, so the fixture is a real project.
 * Node runs each test file in its own process, which makes the `chdir` below
 * safe: the rule resolves its source root from the working directory.
 */
const FIXTURE: Record<string, string> = {
  // A type still declared in the module entry file, used only inside the module.
  "config/home-feed/index.ts":
    "export type HomeFeedConfig = { freshVideoMaxAgeDays: number };\nexport const homeFeedConfig: HomeFeedConfig = { freshVideoMaxAgeDays: 7 };\n",
  "config/home-feed/helpers.ts":
    'import type { HomeFeedConfig } from "./index";\nexport const isFresh = (config: HomeFeedConfig) => config.freshVideoMaxAgeDays > 3;\n',

  // A schema in the module entry file, imported from outside src/config/.
  "config/payments/index.ts":
    'import { z } from "zod";\nexport const paymentSchema = z.object({ amount: z.number() });\nexport const paymentConfig = { retry: true };\n',
  "shared/payment-form.tsx":
    'import { paymentSchema } from "@/config/payments";\nexport function PaymentForm() { return <div />; }\n',

  // An extracted type already in the module's types/ folder.
  "config/theme/types/index.ts": 'export type ThemeName = "light" | "dark";\n',
  "config/theme/index.ts":
    'import type { ThemeName } from "./types";\nexport const themeConfig: { theme: ThemeName } = { theme: "light" };\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-config-extraction-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const DOC = "See docs/next-codebase-guide/rules/configuration-rule.md";

void describe("A type, schema, or utility used only to implement one configuration module MUST be extracted even with one consumer.", () => {
  ruleTester.run("config-extraction", configExtractionRule, {
    valid: [
      // A type already in the module's types/ folder is the extraction destination.
      {
        code: read("config/theme/types/index.ts"),
        filename: file("config/theme/types/index.ts"),
      },
    ],
    invalid: [
      {
        code: read("config/home-feed/index.ts"),
        filename: file("config/home-feed/index.ts"),
        errors: [
          {
            message: `type "HomeFeedConfig" is used only to implement this configuration module; extract it to the module's types/ folder even with one consumer. ${DOC}`,
          },
        ],
      },
      {
        code: read("config/payments/index.ts"),
        filename: file("config/payments/index.ts"),
        errors: [
          {
            message: `schema "paymentSchema" in a configuration module is imported by src/shared/payment-form.tsx outside src/config/. Move it to the matching root support folder. ${DOC}`,
          },
        ],
      },
    ],
  });
});
