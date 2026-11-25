import { describe, ruleTester, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const message =
  "Multiline object and array const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const ordinaryMessage =
  "Consecutive const declarations must not have blank lines between them. See docs/next-codebase-guide/rules/constants-rule.md";
const filename = srcFile("app/layout.tsx");

void describe("Multiline structural constants are separated, while ordinary line wrapping is not a boundary.", () => {
  ruleTester.run("constant-casing:structured-spacing", constantCasingRule, {
    valid: [
      { code: "const a = { key: 1 };\nconst b = [1, 2];", filename },
      { code: "const a =\n  { key: 1 };\nconst b =\n  [1, 2];", filename },
      { code: 'const a =\n  "wrapped string";\nconst b = getValue(\n  { key: 1 },\n);', filename },
      { code: "const a = getValue({\n  key: 1,\n});\nconst b = getOtherValue();", filename },
      { code: "const a = 1;\n\nconst b = {\n  key: a,\n};\n\nconst c = 2;", filename },
      { code: "const a = {\n  key: 1,\n};\n\nconst b = [\n  a,\n];", filename },
      { code: "const a = 1;\n// Intentional comment\nconst b = {\n  key: a,\n};", filename },
      { code: "function f() { const a = 1;\nconst b = {\n  key: a,\n}; }", filename },
    ],
    invalid: [
      {
        code: "const a = 1;\nconst b = {\n  key: a,\n};\nconst c = 2;",
        output: "const a = 1;\n\nconst b = {\n  key: a,\n};\n\nconst c = 2;",
        filename,
        errors: [{ message }, { message }],
      },
      {
        code: "const a = {\n  key: 1,\n};\nconst b = [\n  a,\n];",
        output: "const a = {\n  key: 1,\n};\n\nconst b = [\n  a,\n];",
        filename,
        errors: [{ message }],
      },
      {
        code: "const a = 1;\r\nconst b = [\r\n  a,\r\n] as const;\r\nconst c = 2;",
        output: "const a = 1;\r\n\r\nconst b = [\r\n  a,\r\n] as const;\r\n\r\nconst c = 2;",
        filename,
        errors: [{ message }, { message }],
      },
      {
        code: "const a = 1;\nconst b = ({\n  key: a,\n} satisfies Record<string, number>);\nconst c = 2;",
        output: "const a = 1;\n\nconst b = ({\n  key: a,\n} satisfies Record<string, number>);\n\nconst c = 2;",
        filename,
        errors: [{ message }, { message }],
      },
      {
        code: "const a = 1;\nconst b = <Record<string, number>>{\n  key: a,\n};",
        output: "const a = 1;\n\nconst b = <Record<string, number>>{\n  key: a,\n};",
        filename: srcFile("example.ts"),
        errors: [{ message }],
      },
      {
        code: "const a = 1;\nconst b = ({\n  key: a,\n})!;",
        output: "const a = 1;\n\nconst b = ({\n  key: a,\n})!;",
        filename,
        errors: [{ message }],
      },
      {
        code: "const a = {\n  key: 1,\n};\nfunction f() {}",
        output: "const a = {\n  key: 1,\n};\n\nfunction f() {}",
        filename,
        errors: [{ message }],
      },
      {
        code: 'const documentLanguage = "en";\nconst geistMonoFontVariable = "--font-geist-mono";\nconst geistSansFontVariable = "--font-geist-sans";\nconst rootBodyClasses = "antialiased";\n\nconst geistSans = Geist({ preload: false });\nconst geistMono = Geist_Mono({ preload: false });\nconst fontVariables: CSSProperties & Record<typeof geistSansFontVariable | typeof geistMonoFontVariable, string> = {\n  [geistSansFontVariable]: geistSans.style.fontFamily,\n  [geistMonoFontVariable]: geistMono.style.fontFamily,\n};\nconst layout = createLayout(fontVariables);',
        output:
          'const documentLanguage = "en";\nconst geistMonoFontVariable = "--font-geist-mono";\nconst geistSansFontVariable = "--font-geist-sans";\nconst rootBodyClasses = "antialiased";\nconst geistSans = Geist({ preload: false });\nconst geistMono = Geist_Mono({ preload: false });\n\nconst fontVariables: CSSProperties & Record<typeof geistSansFontVariable | typeof geistMonoFontVariable, string> = {\n  [geistSansFontVariable]: geistSans.style.fontFamily,\n  [geistMonoFontVariable]: geistMono.style.fontFamily,\n};\n\nconst layout = createLayout(fontVariables);',
        filename,
        errors: [{ message: ordinaryMessage }, { message }, { message }],
      },
    ],
  });
});
