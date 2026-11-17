import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import tsParser from "@typescript-eslint/parser";
import { Linter } from "eslint";
import { expect, test } from "vitest";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { noStylingClassAliasRule } from "./no-styling-class-alias";

const DOC = "See docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md";
const MESSAGE = `Do not use enum members or shared class-name constants to style elements; keep Tailwind classes at the JSX/cn/CVA use site or extract a component. ${DOC}`;
const file = srcFile("features/editor/button.tsx");

void describe("An enum member or shared static class-name constant MUST NOT supply styling through JSX className, cn(), clsx(), or cva(); display-only documentation metadata MAY use those strings.", () => {
  ruleTester.run("no-styling-class-alias", noStylingClassAliasRule, {
    valid: [
      { filename: file, code: 'function Card() { return <div className="border-2 p-4" />; }' },
      {
        filename: file,
        code: 'const localClassName = "text-sm"; function Card() { return <p className={localClassName} />; }',
      },
      {
        filename: file,
        code: 'enum PrimitiveCssClass { FireBar = ".h-3px", Hover = ".hover\\\\:shadow-glow" }; const docs = [{ className: PrimitiveCssClass.FireBar }]; render(<code>{docs[0].className}</code>);',
      },
      {
        filename: file,
        code: 'enum PrimitiveCssClass { FireBar = "h-3px" }; const docs = { className: PrimitiveCssClass.FireBar }; show(docs);',
      },
      { filename: file, code: "function Card() { return <div className={styles.card} />; }" },
      {
        filename: file,
        code: 'enum Mode { Compact = "compact", Spacious = "spacious" }; const display = Mode.Compact;',
      },
      { filename: file, code: 'const localClassName = "p-4"; const variant = cva(localClassName);' },
      {
        filename: srcFile("features/editor/button.test.tsx"),
        code: 'enum CSS { Border = "p-4" }; const element = <div className={CSS.Border} />;',
      },
    ],
    invalid: [
      {
        filename: file,
        code: 'enum PrimitiveCssClass { FireBar = "h-3px" }; const view = <div className={PrimitiveCssClass.FireBar} />;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'enum PrimitiveCssClass { Glow = "hover:shadow-glow" }; const view = <div className={cn("p-4", PrimitiveCssClass.Glow)} />;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'enum Appearance { Primary = "text-primary" }; const variants = cva("p-4", { variants: { color: { primary: Appearance.Primary } } });',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'enum Appearance { Active = "block", Hidden = "hidden" }; const view = <div className={active ? Appearance.Active : Appearance.Hidden} />;',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'export const navClassName = "text-sm"; const view = <span className={navClassName} />;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'export const buttonClasses = "px-3 py-2"; const classes = clsx(buttonClasses, "rounded");',
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});

test("Imported enums and class constants, including re-export barrels, are rejected only when used for styling", () => {
  const originalCwd = process.cwd();
  const root = mkdtempSync(path.join(tmpdir(), "pasika-class-alias-"));
  try {
    const sourceRoot = path.join(root, "src");
    const constants = path.join(sourceRoot, "constants");
    const feature = path.join(sourceRoot, "features");
    mkdirSync(constants, { recursive: true });
    mkdirSync(feature, { recursive: true });
    writeFileSync(
      path.join(constants, "styles.ts"),
      'export enum StyleTokens { Button = "rounded px-3" }\nexport const sharedClassName = "px-4";\n',
    );
    writeFileSync(path.join(constants, "index.ts"), 'export { StyleTokens, sharedClassName } from "./styles";\n');
    const filename = path.join(feature, "sample.tsx");
    const source = `import { StyleTokens as Tokens, sharedClassName } from "../constants";
const docs = { className: Tokens.Button };
const view = <div className={cn(Tokens.Button, sharedClassName)} />;
render(<code>{docs.className}</code>);`;
    writeFileSync(filename, source);
    process.chdir(root);
    const linter = new Linter({ configType: "flat" });
    const messages = linter.verify(
      source,
      [
        {
          files: ["**/*.tsx"],
          languageOptions: {
            parser: tsParser,
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: { ecmaFeatures: { jsx: true } },
          },
          plugins: { pasika: { rules: { "no-styling-class-alias": noStylingClassAliasRule } } },
          rules: { "pasika/no-styling-class-alias": "error" },
        },
      ],
      { filename },
    );
    expect(messages.map((message) => message.message)).toEqual([MESSAGE, MESSAGE]);
    expect(readFileSync(filename, "utf8")).toBe(source);
  } finally {
    process.chdir(originalCwd);
    rmSync(root, { recursive: true, force: true });
  }
});
