import { describe, ruleTester, srcFile } from "../rule-tester";
import { noInlineRuntimeLiteralRule } from "./no-inline-runtime-literal";

const file = srcFile("features/editor/screen.tsx");
const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const MESSAGE = `Every runtime string or numeric value must use a named constant or enum member, including single-use values. Only JSX className props permit inline values. ${DOC}`;

void describe("Every runtime string or numeric value MUST be represented by a named constant or enum member, regardless of how many times it is used. Inline className values in JSX props are the only exception for application values.", () => {
  ruleTester.run("no-inline-runtime-literal", noInlineRuntimeLiteralRule, {
    valid: [
      { filename: file, code: 'const message = "Loading"; show(message);' },
      { filename: file, code: `const greeting = \`Hello \${user}\`; show(greeting);` },
      { filename: file, code: 'enum ApiRoute { Post = "/api/post" }; send(ApiRoute.Post);' },
      { filename: file, code: "const post = ApiRoute.Post; fetch(post);" },
      { filename: file, code: 'export function Card({ active }) { return <div className="text-sm" />; }' },
      {
        filename: file,
        code: 'export function Card({ active }) { return <div className={active ? "block" : "hidden"} />; }',
      },
      { filename: file, code: 'import value from "some-module"; export { value } from "some-module";' },
      { filename: file, code: '"use client"; const value = "data";' },
      { filename: file, code: 'const options = { "other-key": namedValue };' },
      { filename: file, code: 'type Value = Pick<Options, "id">; const name = "id";' },
      { filename: file, code: "const count = 3; const enabled = true;" },
      { filename: file, code: "const zero = 0; const one = 1; const negative = -1; const positive = +2;" },
      { filename: file, code: "const timeout = 5_000; setTimeout(callback, timeout);" },
      { filename: file, code: "export const maxFileSize = 20 * 1024 * 1024;" },
      { filename: file, code: "const maxFileSize = (20 * 1024) * 1024 as const;" },
      { filename: file, code: "const ratio = 100 / 4 + 2; const offset = -5 * 2;" },
      { filename: file, code: "const computed = baseOffset + 20; const pixels = (2 << 10) - 1;" },
      { filename: file, code: "enum Size { Max = 20 * 1024 * 1024 }" },
      { filename: file, code: "const max = 100 as const; const minimum = -2 satisfies number;" },
      { filename: file, code: "enum Offset { Previous = -1, Current = 0, Next = 1 }" },
      { filename: file, code: "enum HttpCode { Success = 200, Missing = 404 }" },
      { filename: file, code: "const bigint = 10n; send(bigint);" },
      { filename: file, code: "const indexed = { 0: existing }; type StatusCode = 200; const ok = 1;" },
      { filename: file, code: 'const View = () => <Canvas className={active ? "mt-2" : "mt-4"} />;' },
      { filename: srcFile("features/editor/screen.test.tsx"), code: 'const value = ["inline-in-tests"];' },
    ],
    invalid: [
      { filename: file, code: 'fetch("/api/post");', errors: [{ message: MESSAGE }] },
      { filename: file, code: 'const config = { path: "/api/post" };', errors: [{ message: MESSAGE }] },
      { filename: file, code: 'const values = ["a", "b"];', errors: [{ message: MESSAGE }, { message: MESSAGE }] },
      { filename: file, code: 'const message = { text: "Loading" };', errors: [{ message: MESSAGE }] },
      { filename: file, code: 'show("Loading");', errors: [{ message: MESSAGE }] },
      { filename: file, code: 'let message = "Loading";', errors: [{ message: MESSAGE }] },
      {
        filename: file,
        code: 'const value = ready ? "yes" : "no";',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      { filename: file, code: `fetch(\`/api/\${name}\`);`, errors: [{ message: MESSAGE }] },
      { filename: file, code: "show(`Loading`);", errors: [{ message: MESSAGE }] },
      {
        filename: file,
        code: 'export function Card() { return <div title="Loading" />; }',
        errors: [{ message: MESSAGE }],
      },
      { filename: file, code: "export function Card() { return <div>Loading</div>; }", errors: [{ message: MESSAGE }] },
      {
        filename: file,
        code: 'export function Card() { return <div className="foo" title="bar" />; }',
        errors: [{ message: MESSAGE }],
      },
      { filename: file, code: 'const config = { className: "foo" };', errors: [{ message: MESSAGE }] },
      { filename: file, code: "const config = { className: `foo` };", errors: [{ message: MESSAGE }] },
      { filename: file, code: 'localStorage.setItem("theme", value);', errors: [{ message: MESSAGE }] },
      { filename: file, code: 'eventBus.emit("draft:saved", payload);', errors: [{ message: MESSAGE }] },
      { filename: file, code: "setTimeout(callback, 5000);", errors: [{ message: MESSAGE }] },
      { filename: file, code: "let retries = 1;", errors: [{ message: MESSAGE }] },
      { filename: file, code: "render({ width: 360 });", errors: [{ message: MESSAGE }] },
      { filename: file, code: "const options = { width: 360 };", errors: [{ message: MESSAGE }] },
      {
        filename: file,
        code: "const levels = [-1, 0, 1];",
        errors: [{ message: MESSAGE }, { message: MESSAGE }, { message: MESSAGE }],
      },
      { filename: file, code: "send(10 * 20);", errors: [{ message: MESSAGE }, { message: MESSAGE }] },
      {
        filename: file,
        code: "const config = { width: 20 * 1024 };",
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: "const bytes = calculate(20 * 1024);",
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const label = "first" + "second";',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      { filename: file, code: 'const url = prefix + "/api";', errors: [{ message: MESSAGE }] },
      { filename: file, code: 'const units = 20 + "px";', errors: [{ message: MESSAGE }, { message: MESSAGE }] },
      {
        filename: file,
        code: 'const bad = 100 + (10 + "px");',
        errors: [{ message: MESSAGE }, { message: MESSAGE }, { message: MESSAGE }],
      },
      { filename: file, code: "const message = `Hello` + name;", errors: [{ message: MESSAGE }] },
      { filename: file, code: "const aboveLimit = size > 5000;", errors: [{ message: MESSAGE }] },
      { filename: file, code: "const width = ready ? 0 : 1;", errors: [{ message: MESSAGE }, { message: MESSAGE }] },
      { filename: file, code: "const View = () => <Canvas width={300} />;", errors: [{ message: MESSAGE }] },
      { filename: file, code: "const View = () => <Canvas className={20} />;", errors: [{ message: MESSAGE }] },
      {
        filename: file,
        code: "const View = () => <Canvas className={makeClass(20)} />;",
        errors: [{ message: MESSAGE }],
      },
      { filename: file, code: "send(-1);", errors: [{ message: MESSAGE }] },
      { filename: file, code: "send(+1);", errors: [{ message: MESSAGE }] },
      { filename: file, code: "send(10n);", errors: [{ message: MESSAGE }] },
    ],
  });
});
