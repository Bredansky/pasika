import tsParser from "@typescript-eslint/parser";
import { vi } from "vitest";
import { CwdAwareRuleTester, describe, ruleTester, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

vi.setConfig({ testTimeout: 120_000 });

const MESSAGE =
  "Callable const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const filename = srcFile("features/auth/handlers.ts");
const route = srcFile("app/api/credentials/[id]/route.ts");

const typedRuleTester = new CwdAwareRuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      projectService: { allowDefaultProject: ["src/utils/*.ts"] },
      tsconfigRootDir: process.cwd(),
    },
  },
});

void describe("Callable constants are visually separated from adjacent declarations without separating ordinary value constants.", () => {
  ruleTester.run("constant-casing:callable-spacing", constantCasingRule, {
    valid: [
      {
        code: "export const DELETE = withResponse(\n  deleteContract,\n  async () => ({ data: null }),\n);\n\nexport const PUT = withResponse(\n  renameContract,\n  async () => ({ data: null }),\n);",
        filename: route,
      },
      { code: "const first = () => 1;\n\nconst second = function () { return 2; };", filename },
      { code: "const first = 1;\n\nconst second = () => first;\n\nconst third = 2;", filename },
      { code: "const first = () => 1;\n\nfunction second() {}", filename },
      { code: "const first = () => 1;\n// Second handler\nconst second = () => 2;", filename },
      { code: "export const DELETE = 'delete';\nexport const PUT = 'put';", filename },
      { code: "const GET = 'get';\nconst POST = 'post';", filename: route },
      { code: "const first = getValue(\n  key,\n);\nconst second = 'value';", filename },
      { code: "const first = {\n  nested: 1,\n};\nconst second = 'value';", filename },
      { code: "const first = () => 1;\nconst second = () => 2;", filename: "scripts/build.ts" },
    ],
    invalid: [
      {
        code: "export const DELETE = withResponse(\n  deleteContract,\n  async () => ({ data: null }),\n);\nexport const PUT = withResponse(\n  renameContract,\n  async () => ({ data: null }),\n);",
        output:
          "export const DELETE = withResponse(\n  deleteContract,\n  async () => ({ data: null }),\n);\n\nexport const PUT = withResponse(\n  renameContract,\n  async () => ({ data: null }),\n);",
        filename: route,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "export const GET = handler;\r\nexport const POST = otherHandler;",
        output: "export const GET = handler;\r\n\r\nexport const POST = otherHandler;",
        filename: route,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const first = () => 1;\nconst second = function () { return 2; };",
        output: "const first = () => 1;\n\nconst second = function () { return 2; };",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const first = 1;\nconst second = () => first;\nconst third = 2;",
        output: "const first = 1;\n\nconst second = () => first;\n\nconst third = 2;",
        filename,
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        code: "const first = () => 1;\nfunction second() {}",
        output: "const first = () => 1;\n\nfunction second() {}",
        filename,
        errors: [{ message: MESSAGE }],
      },
    ],
  });

  typedRuleTester.run("constant-casing:typed-callable-spacing", constantCasingRule, {
    valid: [
      {
        code: "declare function createValue(): string;\n\nconst first = createValue();\nconst second = createValue();",
        filename: srcFile("utils/callable-spacing-values.ts"),
      },
      {
        code: "declare function createHandler(): () => void;\n\nconst first = createHandler();\n\nconst second = createHandler();",
        filename: srcFile("utils/callable-spacing-handlers.ts"),
      },
    ],
    invalid: [
      {
        code: "declare function createHandler(): () => void;\n\nconst first = createHandler();\nconst second = createHandler();",
        output:
          "declare function createHandler(): () => void;\n\nconst first = createHandler();\n\nconst second = createHandler();",
        filename: srcFile("utils/callable-spacing-fix.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: "declare function createValue(): string;\n\nconst first = createValue();\n\nconst second = createValue();",
        output:
          "declare function createValue(): string;\n\nconst first = createValue();\nconst second = createValue();",
        filename: srcFile("utils/callable-spacing-value-fix.ts"),
        errors: [{ message: /Consecutive const declarations/ }],
      },
    ],
  });
});
