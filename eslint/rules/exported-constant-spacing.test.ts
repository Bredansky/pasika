import { describe, ruleTester, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const message =
  "Exported and non-exported const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const ordinaryMessage =
  "Consecutive const declarations must not have blank lines between them. See docs/next-codebase-guide/rules/constants-rule.md";
const filename = srcFile("config/app-url/index.ts");

void describe("Export visibility separates otherwise contiguous module constants without changing declaration order.", () => {
  ruleTester.run("constant-casing:exported-spacing", constantCasingRule, {
    valid: [
      { code: "const a = 1;\n\nexport const b = 2;\nexport const c = 3;\n\nconst d = 4;", filename },
      { code: "export const a = 1;\nexport const b =\n  load(a);", filename },
      { code: "const a = 1;\n// Public API\nexport const b = a;", filename },
      { code: "export const a = 1;\n/* Internal */\nconst b = a;", filename },
      { code: "const a = 1;\nconst b = 2;\n\nexport { a };", filename },
      { code: "const a = 1;\nexport const b = 2;", filename: "scripts/build.ts" },
      { code: "export const a = {\n  key: 1,\n};\n\nexport const b = 2;", filename },
      { code: "export const a = () => 1;\n\nexport const b = 2;", filename },
    ],
    invalid: [
      {
        code: "const a = 1;\nexport const b = 2;\nexport const c = 3;\nconst d = 4;",
        output: "const a = 1;\n\nexport const b = 2;\nexport const c = 3;\n\nconst d = 4;",
        filename,
        errors: [{ message }, { message }],
      },
      {
        code: "export const a = 1;\n\nexport const b = 2;",
        output: "export const a = 1;\nexport const b = 2;",
        filename,
        errors: [{ message: ordinaryMessage }],
      },
      {
        code: "export const a = 1;\r\nconst b = a;",
        output: "export const a = 1;\r\n\r\nconst b = a;",
        filename,
        errors: [{ message }],
      },
      {
        code: "const a = 1;\nexport const b =\n  load(a);",
        output: "const a = 1;\n\nexport const b =\n  load(a);",
        filename,
        errors: [{ message }],
      },
      {
        code: "export const a = load();\nconst b = load();",
        output: "export const a = load();\n\nconst b = load();",
        filename,
        errors: [{ message }],
      },
      {
        code: `const appUrlFromEnv = present(process.env.APP_URL);\nconst vercelUrlFromEnv = present(process.env.VERCEL_URL);\nconst deploymentUrl = vercelUrlFromEnv ? \`\${HttpSchemePrefixEnum.Https}\${vercelUrlFromEnv}\` : undefined;\nexport const appUrl =\n  (process.env.VERCEL_ENV === previewEnvironmentName ? deploymentUrl : undefined) ??\n  appUrlFromEnv ??\n  deploymentUrl ??\n  localDevelopmentUrl;`,
        output: `const appUrlFromEnv = present(process.env.APP_URL);\nconst vercelUrlFromEnv = present(process.env.VERCEL_URL);\nconst deploymentUrl = vercelUrlFromEnv ? \`\${HttpSchemePrefixEnum.Https}\${vercelUrlFromEnv}\` : undefined;\n\nexport const appUrl =\n  (process.env.VERCEL_ENV === previewEnvironmentName ? deploymentUrl : undefined) ??\n  appUrlFromEnv ??\n  deploymentUrl ??\n  localDevelopmentUrl;`,
        filename,
        errors: [{ message }],
      },
    ],
  });
});
