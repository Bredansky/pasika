import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { noAsConstRule } from "./no-as-const";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-no-as-const-")));
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const MESSAGE = `Do not use as const assertions; use an explicit type, satisfies, a named constant, or a TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md`;

void describe("Application source MUST NOT use as const assertions; use an explicit type, satisfies, a named constant, or a TypeScript enum instead.", () => {
  ruleTester.run("no-as-const", noAsConstRule, {
    valid: [
      { code: 'const userAccountUserIdColumn = "user_id";', filename: file("constants/user-accounts.ts") },
      { code: 'enum Language { Ukrainian = "uk", English = "en" }', filename: file("constants/languages.ts") },
      { code: "const options = { retries: 2 } satisfies { retries: number };", filename: file("config/options.ts") },
      { code: 'const tuple: readonly [string, number] = ["item", 2];', filename: file("utils/tuple.ts") },
      // prefer-enum already owns the diagnostic for multi-member enum-object substitutes.
      { code: 'const labels = { Ukrainian: "UA", English: "EN" } as const;', filename: file("constants/languages.ts") },
      // The Next.js app source preset only applies the rule under src/.
      { code: "const scriptOptions = { dryRun: true } as const;", filename: path.join(root, "scripts", "run.ts") },
    ],
    invalid: [
      {
        code: 'const UserAccountColumnEnum = { UserId: "user_id" } as const;',
        filename: file("constants/user-accounts.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'const statuses = ["ready", "failed"] as const;',
        filename: file("constants/status.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const options = { retries: 2, enabled: true } as const;",
        filename: file("config/options.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const retries = 2 as const;",
        filename: file("utils/retry.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const nested = { policy: { active: true } as const };",
        filename: file("config/options.ts"),
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
