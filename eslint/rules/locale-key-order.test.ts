import { describe, ruleTester, srcFile } from "../rule-tester";
import { localeKeyShapeRule } from "./locale-key-shape";

void describe("Locale dictionary keys MUST be sorted alphabetically.", () => {
  ruleTester.run("locale-key-shape-order", localeKeyShapeRule, {
    valid: [
      {
        filename: srcFile("locales/global.ts"),
        code: 'export const global = { accept: "Accept", cancel: "Cancel", save: "Save" };',
      },
      {
        filename: srcFile("locales/home.ts"),
        code: 'export const home = { article10: "Ten", article2: "Two", article9: "Nine" };',
      },
    ],
    invalid: [
      {
        filename: srcFile("locales/global.ts"),
        code: 'export const global = { save: "Save", cancel: "Cancel" };',
        errors: [
          {
            message:
              'Locale dictionary keys must be alphabetical: "cancel" belongs before "save". See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
    ],
  });
});
