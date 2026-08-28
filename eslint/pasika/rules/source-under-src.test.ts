import path from "node:path";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { sourceUnderSrcRule } from "./source-under-src";

void describe("Application source MUST live under src/.", () => {
  ruleTester.run("source-under-src", sourceUnderSrcRule, {
    valid: [
      // Under src/ is the requirement itself.
      { code: "export const a = 1;", filename: srcFile("app/page.tsx") },
      { code: "export const a = 1;", filename: srcFile("utils/format-date.ts") },
      { code: "export const a = 1;", filename: srcFile("features/billing/invoice.tsx") },
      // Config files at the repository root are not application source.
      { code: "export default [];", filename: path.resolve("eslint.config.ts") },
      { code: "export default {};", filename: path.resolve("tsup.config.ts") },
      { code: "export default {};", filename: path.resolve("next.config.mjs") },
      // Declaration and dotfiles are not application source.
      { code: "export {};", filename: path.resolve("next-env.d.ts") },
      { code: "module.exports = {};", filename: path.resolve(".eslintrc.js") },
      // Tooling and documentation directories are exempt.
      { code: "export const a = 1;", filename: path.resolve("docs/examples.ts") },
      { code: "export const a = 1;", filename: path.resolve("tests/setup.ts") },
      { code: "export const a = 1;", filename: path.resolve("cli/index.ts") },
      { code: "export const a = 1;", filename: path.resolve("scripts/coverage-helpers.ts") },
    ],
    invalid: [
      {
        code: "export const a = 1;",
        filename: path.resolve("lib/format-date.ts"),
        errors: [{ message: 'Application source must live under src/. Move "lib/format-date.ts" under src/.' }],
      },
      {
        code: "export const a = 1;",
        filename: path.resolve("components/button.tsx"),
        errors: 1,
      },
      {
        code: "export const a = 1;",
        filename: path.resolve("root-file.ts"),
        errors: [{ message: 'Application source must live under src/. Move "root-file.ts" under src/.' }],
      },
    ],
  });
});
