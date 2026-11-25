import { describe, ruleTester, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const message =
  "Multiline object and array const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const ordinaryMessage =
  "Consecutive const declarations must not have blank lines between them. See docs/next-codebase-guide/rules/constants-rule.md";
const filename = srcFile("constants/api-contracts.ts");

const createContract = [
  "export const createCredentialApiContract = defineApiContract({",
  "  method: HttpMethod.Post,",
  "  path: listCredentialsApiContract.path,",
  "  requestSchema: createCredentialRequestSchema,",
  "  responseSchema: platformCredentialApiSchema,",
  "});",
].join("\n");
const renameContract = [
  "export const renameCredentialApiContract = defineApiContract({",
  "  method: HttpMethod.Put,",
  "  path: ApiRoute.CredentialById,",
  "  requestSchema: renameCredentialRequestSchema,",
  "  responseSchema: platformCredentialApiSchema,",
  "});",
].join("\n");

void describe("Calls with multiline structural arguments are separated; mere wrapping of arguments is not a boundary.", () => {
  ruleTester.run("constant-casing:structured-call-spacing", constantCasingRule, {
    valid: [
      { code: `${createContract}\n\n${renameContract}`, filename },
      { code: "const a = Geist({ preload: false });\nconst b = Geist_Mono({ preload: false });", filename },
      { code: "const a = load(\n  { key: 1 },\n  [1, 2],\n);\nconst b = load();", filename },
      { code: "const a = load(\n  first,\n  second,\n);\nconst b = load();", filename },
      { code: "const a = load({\n  key: 1,\n});\n// Next value\nconst b = load();", filename },
      { code: "const a = load(() => {\n  return { key: 1 };\n});\nconst b = load();", filename },
      { code: "const a = load({\n  key: 1,\n});\nconst b = load();", filename: "scripts/build.ts" },
    ],
    invalid: [
      {
        code: `${createContract}\n${renameContract}`,
        output: `${createContract}\n\n${renameContract}`,
        filename,
        errors: [{ message }],
      },
      {
        code: "const a = load();\nconst b = load({\n  key: 1,\n});\nconst c = load();",
        output: "const a = load();\n\nconst b = load({\n  key: 1,\n});\n\nconst c = load();",
        filename,
        errors: [{ message }, { message }],
      },
      {
        code: "const a = load();\nconst b = load(key, [\n  1,\n  2,\n]);",
        output: "const a = load();\n\nconst b = load(key, [\n  1,\n  2,\n]);",
        filename,
        errors: [{ message }],
      },
      {
        code: "const a = load();\nconst b = load({\n  key: 1,\n} satisfies Record<string, number>);",
        output: "const a = load();\n\nconst b = load({\n  key: 1,\n} satisfies Record<string, number>);",
        filename,
        errors: [{ message }],
      },
      {
        code: "const a = load();\nconst b = load(wrap({\n  key: 1,\n}));",
        output: "const a = load();\n\nconst b = load(wrap({\n  key: 1,\n}));",
        filename,
        errors: [{ message }],
      },
      {
        code: "const a = load();\nconst b = load?.({\n  key: 1,\n});",
        output: "const a = load();\n\nconst b = load?.({\n  key: 1,\n});",
        filename,
        errors: [{ message }],
      },
      {
        code: "const a = load();\r\nconst b = load({\r\n  key: 1,\r\n});",
        output: "const a = load();\r\n\r\nconst b = load({\r\n  key: 1,\r\n});",
        filename,
        errors: [{ message }],
      },
      {
        code: "const a = load(\n  { key: 1 },\n);\n\nconst b = load();",
        output: "const a = load(\n  { key: 1 },\n);\nconst b = load();",
        filename,
        errors: [{ message: ordinaryMessage }],
      },
    ],
  });
});
