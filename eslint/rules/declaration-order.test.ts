import { describe, ruleTester, srcFile } from "../rule-tester";
import { declarationOrderRule } from "./declaration-order";

const filename = srcFile("features/credentials/SettingsPage/badge.tsx");
const MESSAGE =
  "Order independent declarations as types, enums, constants (alphabetically), functions, then local exports. See docs/next-codebase-guide/rules/constants-rule.md";

void describe("Within safely reorderable module declaration groups, types and interfaces MUST precede enums, enums MUST precede constants, constants MUST precede functions, and local export lists MUST come last; independent literal constants MUST be sorted by name.", () => {
  ruleTester.run("declaration-order", declarationOrderRule, {
    valid: [
      { code: "const alpha = 1;\nconst beta = 2;", filename },
      { code: "type T = string;\nenum E { A, B }\nconst a = 1;\nfunction f() {}\nexport { f };", filename },
      { code: "const z = load();\nconst a = load();", filename },
      { code: "const z = 1;\nconst a = z;", filename },
      { code: "const z = 1;\nconst derived = z + 1;\nconst a = 2;", filename },
      { code: "const z = 1;\n// Keep section\nconst a = 2;", filename },
      { code: "const z = 1; // Attached\nconst a = 2;", filename },
      { code: "const z = /* attached */ 1;\nconst a = 2;", filename },
      { code: "const z = 1;\nsetup();\nconst a = 2;", filename },
      { code: "const z = 1;\nimport './setup';\nconst a = 2;", filename },
      { code: "const z = 1;\nexport * from './setup';\nconst a = 2;", filename },
      { code: "const z = 1;\nenum E { A = getValue() }\nconst a = 2;", filename },
      { code: "const z = 1;\nconst a = { ...source };", filename },
      { code: "const z = 1;\nconst a = { [key]: 2 };", filename },
      { code: "const z = 1;\nconst a = { get value() { return 2; } };", filename },
      { code: "const z = 1;\nconst a = [getValue()];", filename },
      { code: "const z = 1;\nconst a = 1, b = 2;", filename },
      { code: "const z = 1;\nconst { a } = config;", filename },
      { code: "function f(x: string): string;\nfunction f(x: string) { return x; }\nconst a = 1;", filename },
      { code: "function f() { const z = 1; const a = 2; }", filename },
      { code: "let z = 1;\nlet a = 2;", filename },
      { code: "enum Z { Second = 2, First = 1 }\nenum A { Second = 2, First = 1 }", filename },
      { code: "const z = 1;\nconst a = 2;", filename: "scripts/build.ts" },
    ],
    invalid: [
      {
        code: 'const badgeFocusBorderClass = "focus";\nexport enum BadgeChoice { Default = "default", Secondary = "secondary", Destructive = "destructive" }\nconst badgeSlot = "badge";\nconst badgeSecondaryClasses =\n  "long classes";\nconst badgeVariants = cva(badgeSlot);\nfunction Badge() {}\nexport { Badge };',
        output:
          'export enum BadgeChoice { Default = "default", Secondary = "secondary", Destructive = "destructive" }\n\nconst badgeFocusBorderClass = "focus";\nconst badgeSecondaryClasses =\n  "long classes";\nconst badgeSlot = "badge";\nconst badgeVariants = cva(badgeSlot);\nfunction Badge() {}\nexport { Badge };',
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "function run() {}\nconst z = 1;\ninterface Props {}\nenum E { A = 1 }\nconst a = 2;\nexport { run };",
        output:
          "interface Props {}\n\nenum E { A = 1 }\n\nconst a = 2;\nconst z = 1;\n\nfunction run() {}\n\nexport { run };",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "export { run };\nfunction run() {}\ntype T = string;",
        output: "type T = string;\n\nfunction run() {}\n\nexport { run };",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "export const z = 1;\r\nconst a = 2;",
        output: "const a = 2;\r\nexport const z = 1;",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const z = 1;\nconst a = { nested: [true, false, null, -2, +3, 4n, 'x'] } as const;",
        output: "const a = { nested: [true, false, null, -2, +3, 4n, 'x'] } as const;\nconst z = 1;",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const z = 1;\nconst a = (2 satisfies number);",
        output: "const a = (2 satisfies number);\nconst z = 1;",
        filename,
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const z = 1;\nconst a = 2;\nconst derived = load(a);\nconst y = 3;\nconst b = 4;",
        output: "const a = 2;\nconst z = 1;\nconst derived = load(a);\nconst b = 4;\nconst y = 3;",
        filename,
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        code: "const z = 1;\nconst a = <number>2;",
        output: "const a = <number>2;\nconst z = 1;",
        filename: srcFile("example.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const z = 1;\nconst a = `hello`;",
        output: "const a = `hello`;\nconst z = 1;",
        filename,
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
