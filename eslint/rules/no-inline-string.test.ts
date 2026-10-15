import { describe, ruleTester, srcFile } from "../rule-tester";
import { noInlineStringRule } from "./no-inline-string";

const file = srcFile("features/editor/screen.tsx");
const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const MESSAGE = `Inline runtime strings must be declared as named constants or enum members; only JSX className props permit inline strings. ${DOC}`;

void describe("Every runtime string value MUST be a named const or enum member; an inline string MAY appear only inside a JSX className prop.", () => {
  ruleTester.run("no-inline-string", noInlineStringRule, {
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
    ],
  });
});
