import { describe, ruleTester, srcFile } from "../rule-tester";
import { noInlineRuntimeLiteralRule } from "./no-inline-runtime-literal";

const file = srcFile("features/editor/screen.tsx");
const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const MESSAGE = `Every runtime string or numeric value must use a named constant or enum member, including single-use values. Inline JSX className/data-component, canonical locale strings, and static Next.js matchers are exempt. ${DOC}`;

void describe("Every runtime string or numeric value MUST be represented by a named constant or enum member, regardless of how many times it is used. JSX `className` values, static `data-component` markers, direct strings in named `src/locales/` dictionaries, and static Next.js `config.matcher` values are exempt.", () => {
  ruleTester.run("no-inline-runtime-literal", noInlineRuntimeLiteralRule, {
    valid: [
      { filename: file, code: 'const message = "Loading"; show(message);' },
      { filename: file, code: `const greeting = \`Hello \${user}\`; show(greeting);` },
      { filename: file, code: 'enum ApiRoute { Post = "/api/post" }; send(ApiRoute.Post);' },
      { filename: file, code: "const post = ApiRoute.Post; fetch(post);" },
      { filename: file, code: 'export function Card({ active }) { return <div className="text-sm" />; }' },
      { filename: file, code: 'export function Card() { return <div data-component="Card" />; }' },
      { filename: file, code: 'declare module "next-auth" { interface Session { user: User } }' },
      { filename: file, code: 'declare module "next-auth/jwt" { interface JWT { sub: string } }' },
      {
        filename: srcFile("middleware.ts"),
        code: 'export const config = { matcher: "/api/:path*" };',
      },
      {
        filename: srcFile("middleware.ts"),
        code: 'export const config = { matcher: ["/api/:path*"] } satisfies MiddlewareConfig;',
      },
      {
        filename: srcFile("proxy.ts"),
        code: 'export const config = { matcher: ["/api/:path*", { source: "/admin/:path*", has: [{ type: "header", key: "x-auth", value: "yes" }] }] };',
      },
      {
        filename: srcFile("proxy.ts"),
        code: 'export const config = { "matcher": ["/api/:path*"] };',
      },
      {
        filename: file,
        code: 'export function Card({ active }) { return <div className={active ? "block" : "hidden"} />; }',
      },
      { filename: file, code: 'import value from "some-module"; export { value } from "some-module";' },
      { filename: file, code: '"use client"; const value = "data";' },
      {
        filename: file,
        code: 'import { Inter, Inconsolata as Mono } from "next/font/google"; const inter = Inter({ subsets: ["latin", "cyrillic"], weight: ["400", "700"], display: "swap", fallback: ["Arial"], variable: "--font-inter" }); const mono = Mono({ subsets: ["latin"] });',
      },
      {
        filename: file,
        code: 'import localFont from "next/font/local"; const mono = localFont({ src: [{ path: "./fonts/mono.woff2", weight: "400", style: "normal" }], declarations: [{ prop: "font-feature-settings", value: "normal" }], display: "swap" });',
      },
      {
        filename: file,
        code: 'import { Inter as BrandFont } from "next/font/google"; const font = BrandFont({ "subsets": ["latin"] });',
      },
      { filename: file, code: 'const options = { "other-key": namedValue };' },
      { filename: file, code: 'type Value = Pick<Options, "id">; const name = "id";' },
      { filename: file, code: "const count = 3; const enabled = true;" },
      { filename: file, code: "const zero = 0; const one = 1; const negative = -1; const positive = +2;" },
      { filename: file, code: "const timeout = 5_000; setTimeout(callback, timeout);" },
      { filename: file, code: "const maxFileSize = 20_971_520;" },
      { filename: file, code: "const factor = 1024; const size = 20; const bytes = size * factor;" },
      { filename: file, code: 'const fullName = "firstsecond";' },
      { filename: file, code: 'const first = "first"; const second = "second"; const fullName = first + second;' },
      { filename: file, code: "const max = 100 as const; const minimum = -2 satisfies number;" },
      { filename: file, code: "enum Offset { Previous = -1, Current = 0, Next = 1 }" },
      { filename: file, code: "enum HttpCode { Success = 200, Missing = 404 }" },
      { filename: file, code: "const bigint = 10n; send(bigint);" },
      { filename: file, code: "const indexed = { 0: existing }; type StatusCode = 200; const ok = 1;" },
      { filename: file, code: 'const View = () => <Canvas className={active ? "mt-2" : "mt-4"} />;' },
      { filename: srcFile("features/editor/screen.test.tsx"), code: 'const value = ["inline-in-tests"];' },
      {
        filename: srcFile("locales/global.ts"),
        code: 'export const global = { welcome: "Ласкаво просимо" };',
      },
      {
        filename: srcFile("locales/editor.ts"),
        code: 'export const editor = { cancel: "Cancel", save: "Save" } as const;',
      },
      {
        filename: srcFile("locales/stream.ts"),
        code: 'export const stream = { save: "Save" } satisfies Record<string, string>;',
      },
      {
        filename: srcFile("locales/user-settings.ts"),
        code: 'export const userSettings = { saveChanges: "Save changes" } as const;',
      },
      {
        filename: srcFile("features/mocks/utils/draft-preview-mock.test.ts"),
        code: 'const mock = new Headers({ "Content-Type": "image/png" });',
      },
      {
        filename: srcFile("features/editor/__mocks__/service.ts"),
        code: 'const mock = new Headers({ "Content-Type": "image/png" });',
      },
      {
        filename: srcFile("features/editor/service.mock.ts"),
        code: 'const mock = new Headers({ "Content-Type": "image/png" });',
      },
      {
        filename: srcFile("locales/global.ts"),
        code: "export const global = { greeting: `Hello` };",
      },
    ],
    invalid: [
      {
        filename: file,
        code: 'import { Inter } from "another-font-library"; const font = Inter({ subsets: ["latin"] });',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import Inter from "next/font/google"; const font = Inter({ subsets: ["latin"] });',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { Inter } from "next/font/google"; function makeFont(Inter) { return Inter({ subsets: ["latin"] }); }',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { Inter } from "next/font/google"; const font = Inter({ other: ["latin"] });',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { Inter } from "next/font/google"; const font = Inter({ subsets: ["latin" + suffix] });',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { Inter } from "next/font/google"; const font = Inter({ subsets: transform("latin") });',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { Inter } from "next/font/google"; const options = { subsets: ["latin"] }; const font = Inter(options);',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import { Inter } from "next/font/google"; const font = Inter({ subsets: ["latin"] }); fetch("/api/users");',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'import font from "next/font/local"; const options = { src: "./mono.woff2" }; font(options);',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: "export const maxFileSize = 20 * 1024 * 1024;",
        errors: [{ message: MESSAGE }, { message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: "const maxFileSize = (20 * 1024) * 1024 as const;",
        errors: [{ message: MESSAGE }, { message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: "const ratio = 100 / 4 + 2; const offset = -5 * 2;",
        errors: [
          { message: MESSAGE },
          { message: MESSAGE },
          { message: MESSAGE },
          { message: MESSAGE },
          { message: MESSAGE },
        ],
      },
      {
        filename: file,
        code: "const computed = baseOffset + 20; const pixels = (2 << 10) - 1;",
        errors: [{ message: MESSAGE }, { message: MESSAGE }, { message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const fullName = "first" + "second";',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const url = prefix + "/api";',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const units = 20 + "px";',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const mixed = 100 + (10 + "px");',
        errors: [{ message: MESSAGE }, { message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: "const greeting = `Hello` + name;",
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const nested = ("first" + "second") + "!";',
        errors: [{ message: MESSAGE }, { message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const greeting = ("Hello " + name) as string;',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: "enum Size { Max = 20 * 1024 * 1024 }",
        errors: [{ message: MESSAGE }, { message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: "enum Flags { Read = 1 << 0 }",
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: "enum Size { Max = 20 * 1024 as number }",
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'send("first" + "second");',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const options = { name: "first" + "second" };',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'let name = "first" + "second";',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: file,
        code: 'const name = format("first" + "second");',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: srcFile("locales/global.ts"),
        code: `export const global = { greeting: \`Hello \${name}\` };`,
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("features/mocks/utils/draft-preview-mock.ts"),
        code: 'const headers = new Headers({ "Content-Type": "image/png", "X-Format": "post_45" });',
        errors: [{ message: MESSAGE }, { message: MESSAGE }],
      },
      {
        filename: srcFile("mocks/preview.ts"),
        code: 'reply({ "Content-Type": "image/png" });',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("locales/global.ts"),
        code: 'export const global = { save: "Save" }; send("not a translation");',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("locales/global.ts"),
        code: 'const global = { save: "Save" };',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("locales/global.ts"),
        code: 'export const global = { nested: { deeper: { invalid: "too deep" } } };',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("locales/global.ts"),
        code: "export const global = { retries: 3 };",
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("locales/global.ts"),
        code: 'export const global = { good: "Saved", bad: format("inline") };',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("features/editor/screen.tsx"),
        code: 'export const locales = { save: "Save" };',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'export function Card() { return <div data-component={"Card"} />; }',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'export function Card() { return <div data-test="Card" />; }',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: file,
        code: 'export const config = { matcher: "/api/:path*" };',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("middleware.ts"),
        code: 'const config = { matcher: "/api/:path*" };',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("proxy.ts"),
        code: 'export const other = { matcher: "/api/:path*" };',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("middleware.ts"),
        code: 'export const config = { path: "/api/:path*" };',
        errors: [{ message: MESSAGE }],
      },
      {
        filename: srcFile("proxy.ts"),
        code: 'export const config = { matcher: matcherFor("/api/:path*") };',
        errors: [{ message: MESSAGE }],
      },
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
