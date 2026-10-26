import tsParser from "@typescript-eslint/parser";
import { vi } from "vitest";
import { CwdAwareRuleTester, describe, ruleTester, srcFile } from "../rule-tester";
import { preferObjectDestructuringRule } from "./prefer-object-destructuring";

vi.setConfig({ testTimeout: 120_000 });

const doc = "See docs/next-codebase-guide/rules/redundant-aliases-rule.md";

const typedRuleTester = new CwdAwareRuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: "module",
    parserOptions: {
      projectService: {
        allowDefaultProject: ["src/utils/*.ts"],
        maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 8,
      },
      tsconfigRootDir: process.cwd(),
    },
  },
});

void describe("A variable MUST NOT be created just to read one object property. Use the property directly. Destructuring with a default value or rest properties is allowed.", () => {
  ruleTester.run("prefer-object-destructuring-single-field", preferObjectDestructuringRule, {
    valid: ["use(process.env.TELEGRAM_WEBHOOK_SECRET);", "const { value = 1 } = file;", "use(loadFile().value);"],
    invalid: [
      {
        code: "async function run(job) { const status = job.status; await refresh(job); use(status); }",
        output: null,
        errors: [
          {
            message: `"status" is the only property bound from "job". Read "job.status" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
      {
        code: "const token = getConfig().token; send(token); log(token);",
        output: null,
        errors: [
          {
            message: `"token" is the only property bound from "getConfig()". Read "getConfig().token" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
      {
        code: "const { token } = getConfig(); send(token);",
        output: null,
        errors: [
          {
            message: `"token" is the only property bound from "getConfig()". Read "getConfig().token" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
      {
        code: "const { value } = loadFile(); use(value);",
        output: null,
        errors: [
          {
            message: `"value" is the only property bound from "loadFile()". Read "loadFile().value" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
      {
        code: "const { TELEGRAM_WEBHOOK_SECRET } = process.env; use(TELEGRAM_WEBHOOK_SECRET);",
        output: null,
        errors: [
          {
            message: `"TELEGRAM_WEBHOOK_SECRET" is the only property bound from "process.env". Read "process.env.TELEGRAM_WEBHOOK_SECRET" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
      {
        code: "const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET; use(TELEGRAM_WEBHOOK_SECRET);",
        output: null,
        errors: [
          {
            message: `"TELEGRAM_WEBHOOK_SECRET" is the only property bound from "process.env". Read "process.env.TELEGRAM_WEBHOOK_SECRET" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
    ],
  });
});

void describe("When a block reads two or more different properties from one object, it MUST destructure them together. Keep direct access when a namespace, field mapping, invalid variable name, or name conflict prevents this.", () => {
  ruleTester.run("prefer-object-destructuring", preferObjectDestructuringRule, {
    valid: [
      "use(file.previewUrl);",
      "const { type, id } = file; use(type, id);",
      "const fileType = file.type;",
      "const { value = 1 } = file;",
      "const { value, ...rest } = file;",
      "function show({ value }) { return value; }",
      "use(createFile().value);",
      "const { key } = file?.config ?? {};",
      "use(process.env.TELEGRAM_WEBHOOK_SECRET);",
      "export const apiRoutePath = textEditApiContract.path;",
      "const value = getValue();",
      'const value = file["value"];',
      "const value: string = file.value;",
      "const value = file?.value;",
      "const errorMessage = locales.editor.missingRenderJobIds;",
      "const credentials = locales.credentials;",
      "use(locales.editor.save); use(locales.editor.cancel);",
      "use(row.user_account_id); use(row.created_at);",
      "config.first(); config.second();",
      "config.first = 1; config.second = 2;",
      "config.first++; delete config.second;",
      "for (config.first in source) {} for (config.second of source) {}",
      "use(config.current.first); use(config.current.second);",
      "use(config.size);",
      "use(config.size); use(config.size);",
      "function dimensions(config) { return config.current.width * config.current.height; }",
      "const width = 1; function dimensions(config) { return config.width * config.height; }",
      "function render(layer) { if (layer.type) use(layer.type); const { color, type } = layer; use(color, type); }",
      "function render(position) { use(position.width, position.height); return (box) => { const { width, height } = box; return width + height; }; }",
      "function process(post) { use(post.id, post.currentPayload); return [1].map((id) => id); }",
      "products.map((product) => product.id);",
      "products.map((product) => ({ id: product.id, key: product.id }));",
      "products.map((product) => ({ id: product.id, nested: [1].map(() => product.category) }));",
      "const id = 5; products.map((product) => ({ id: product.id, category: product.category }));",
    ],
    invalid: [
      {
        code: "const dimensions = (config) => config.width * config.height;",
        output: null,
        errors: [
          {
            message: `"width", "height" are read from "config" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: "products.map((product) => ({ id: product.id, category: product.category, content: <Card key={product.id} product={product} /> }));",
        output: null,
        errors: [
          {
            message: `"id", "category" are read from "product" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: "products.map((product) => <Card id={product.id} category={product.category} product={product} />);",
        output: null,
        errors: [
          {
            message: `"id", "category" are read from "product" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: "products.map((product) => ({ id: product.id, category: product.category, nested: values.map((value) => value.id) }));",
        output: null,
        errors: [
          {
            message: `"id", "category" are read from "product" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: "const { previewUrl } = file; use(previewUrl);",
        output: null,
        errors: [
          {
            message: `"previewUrl" is the only property bound from "file". Read "file.previewUrl" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
      {
        code: "const { TELEGRAM_WEBHOOK_SECRET } = process.env; use(TELEGRAM_WEBHOOK_SECRET);",
        output: null,
        errors: [
          {
            message: `"TELEGRAM_WEBHOOK_SECRET" is the only property bound from "process.env". Read "process.env.TELEGRAM_WEBHOOK_SECRET" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
      {
        code: "const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET; use(TELEGRAM_WEBHOOK_SECRET);",
        output: null,
        errors: [
          {
            message: `"TELEGRAM_WEBHOOK_SECRET" is the only property bound from "process.env". Read "process.env.TELEGRAM_WEBHOOK_SECRET" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
      {
        code: "const { first } = file; use(file.second, first);",
        output: "const { first, second } = file; use(second, first);",
        errors: [
          {
            message: `"first", "second" are read from "file" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: "const previewUrl = file.previewUrl;",
        output: null,
        errors: [
          {
            message: `"previewUrl" is the only property bound from "file". Read "file.previewUrl" directly instead of creating a local binding. ${doc}`,
          },
        ],
      },
      {
        code: [
          "const previewUrl = file.previewUrl;",
          "const type = file.type;",
          "const id = file.id;",
          "const duration = file.duration;",
        ].join("\n"),
        output: "const { previewUrl, type, id, duration } = file;",
        errors: [
          {
            message: `"previewUrl", "type", "id", "duration" are derived directly from properties of "file". Use one object destructuring declaration. ${doc}`,
          },
        ],
      },
      {
        code: ["const first = file.first;", "// keep separate", "const second = file.second;"].join("\n"),
        output: null,
        errors: [
          {
            message: `"first", "second" are read from "file" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: [
          "const x = layer.position.x;",
          "const width = layer.position.width;",
          "const height = layer.position.height;",
          "const zIndex = layer.position.zIndex;",
        ].join("\n"),
        output: null,
        errors: [
          {
            message: `"x", "width", "height", "zIndex" are derived directly from properties of "layer.position". Use one object destructuring declaration. ${doc}`,
          },
        ],
      },
      {
        code: [
          "const { x } = layer.position;",
          "const { width } = layer.position;",
          "const { height } = layer.position;",
          "const { zIndex } = layer.position;",
        ].join("\n"),
        output: null,
        errors: [
          {
            message: `"x", "width", "height", "zIndex" destructure the same source "layer.position" repeatedly. Combine them into one object destructuring declaration. ${doc}`,
          },
        ],
      },
      {
        code: ["const { first } = file;", "const { second } = file;"].join("\n"),
        output: "const { first, second } = file;",
        errors: [
          {
            message: `"first", "second" destructure the same source "file" repeatedly. Combine them into one object destructuring declaration. ${doc}`,
          },
        ],
      },
      {
        code: "const first = file.first, second = file.second;",
        output: "const { first, second } = file;",
        errors: [
          {
            message: `"first", "second" are derived directly from properties of "file". Use one object destructuring declaration. ${doc}`,
          },
        ],
      },
      {
        code: "const first = file.first, value = other.value;",
        output: null,
        errors: 2,
      },
      {
        code: [
          "function icon(config) {",
          '  const { emoji, fontSize, background = "transparent" } = config;',
          "  return { width: config.size, height: config.size, emoji, fontSize, background };",
          "}",
        ].join("\n"),
        output: [
          "function icon(config) {",
          '  const { emoji, fontSize, background = "transparent", size } = config;',
          "  return { width: size, height: size, emoji, fontSize, background };",
          "}",
        ].join("\n"),
        errors: [
          {
            message: `"emoji", "fontSize", "background", "size" are read from "config" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: ["function dimensions(config) {", "  return config.width * config.height;", "}"].join("\n"),
        output: [
          "function dimensions(config) {",
          "  const { width, height } = config;",
          "  return width * height;",
          "}",
        ].join("\n"),
        errors: [
          {
            message: `"width", "height" are read from "config" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: [
          "function dimensions(config) {",
          "  const { width, height } = config;",
          "  return config.width * config.height;",
          "}",
        ].join("\n"),
        output: [
          "function dimensions(config) {",
          "  const { width, height } = config;",
          "  return width * height;",
          "}",
        ].join("\n"),
        errors: [
          {
            message: `"width", "height" are read from "config" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: [
          "function dimensions(config) {",
          "  const {} = config;",
          "  return config.width * config.height;",
          "}",
        ].join("\n"),
        output: [
          "function dimensions(config) {",
          "  const {width, height} = config;",
          "  return width * height;",
          "}",
        ].join("\n"),
        errors: [
          {
            message: `"width", "height" are read from "config" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
    ],
  });
});

void describe("Callable object fields count toward grouped destructuring without detaching receiver-sensitive methods.", () => {
  typedRuleTester.run("prefer-object-destructuring-callable-fields", preferObjectDestructuringRule, {
    valid: [
      {
        code: [
          "declare function renderHook(): { result: { current: number }; unmount: () => void };",
          "function test() {",
          "  const { result, unmount } = renderHook();",
          "  use(result.current);",
          "  unmount();",
          "}",
        ].join("\n"),
        filename: srcFile("utils/callable-props.ts"),
      },
      {
        code: [
          "class Hook { result = 1; unmount() { use(this.result); } }",
          "function test() {",
          "  const hook = new Hook();",
          "  use(hook.result);",
          "  hook.unmount();",
          "}",
        ].join("\n"),
        filename: srcFile("utils/callable-props.ts"),
      },
      {
        code: [
          "interface Hook { result: number; unmount(): void }",
          "declare function renderHook(): Hook;",
          "function test() { const hook = renderHook(); use(hook.result); hook.unmount(); }",
        ].join("\n"),
        filename: srcFile("utils/callable-props.ts"),
      },
      {
        code: [
          "interface Hook { result: number; unmount: (this: Hook) => void }",
          "declare function renderHook(): Hook;",
          "function test() { const hook = renderHook(); use(hook.result); hook.unmount(); }",
        ].join("\n"),
        filename: srcFile("utils/callable-props.ts"),
      },
    ],
    invalid: [
      {
        code: [
          "declare function renderHook(): { result: { current: number }; unmount: () => void };",
          "function test() {",
          "  const hook = renderHook();",
          "  use(hook.result.current);",
          "  hook.unmount();",
          "}",
        ].join("\n"),
        output: null,
        errors: [
          {
            message: `"result", "unmount" are read from "hook" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
        filename: srcFile("utils/callable-props.ts"),
      },
      {
        code: [
          "function test() {",
          "  const hook = { result: 1, unmount: () => {} };",
          "  use(hook.result);",
          "  hook.unmount();",
          "}",
        ].join("\n"),
        output: null,
        errors: [
          {
            message: `"result", "unmount" are read from "hook" in the same block. Destructure them together in one declaration. ${doc}`,
          },
        ],
        filename: srcFile("utils/callable-props.ts"),
      },
    ],
  });
});

void describe("Enum member accesses MUST remain qualified through the enum name, and enum values MUST NOT be object-destructured.", () => {
  ruleTester.run("prefer-object-destructuring-enums", preferObjectDestructuringRule, {
    valid: [
      [
        'enum Platform { Telegram = "telegram", Twitter = "twitter" }',
        "use(Platform.Telegram);",
        "use(Platform.Twitter);",
      ].join("\n"),
      ['enum Platform { Telegram = "telegram" }', "const Telegram = Platform.Telegram;", "use(Telegram);"].join("\n"),
    ],
    invalid: [
      {
        code: [
          'enum Platform { Telegram = "telegram", Twitter = "twitter" }',
          "const { Telegram, Twitter } = Platform;",
          "use(Telegram, Twitter);",
        ].join("\n"),
        errors: [
          {
            message: `"Platform" is an enum. Keep enum member accesses qualified instead of destructuring it. ${doc}`,
          },
        ],
      },
    ],
  });
});

void describe("Enum member accesses MUST remain qualified through the enum name, and enum values MUST NOT be object-destructured. (typed imports)", () => {
  typedRuleTester.run("prefer-object-destructuring-imported-enums", preferObjectDestructuringRule, {
    valid: [
      {
        code: [
          'import { SyntaxKind } from "typescript";',
          "use(SyntaxKind.Identifier);",
          "use(SyntaxKind.StringLiteral);",
        ].join("\n"),
        filename: srcFile("utils/enum-valid.ts"),
      },
    ],
    invalid: [
      {
        code: [
          'import { SyntaxKind } from "typescript";',
          "const { Identifier, StringLiteral } = SyntaxKind;",
          "use(Identifier, StringLiteral);",
        ].join("\n"),
        filename: srcFile("utils/enum-invalid.ts"),
        errors: [
          {
            message: `"SyntaxKind" is an enum. Keep enum member accesses qualified instead of destructuring it. ${doc}`,
          },
        ],
      },
    ],
  });
});
