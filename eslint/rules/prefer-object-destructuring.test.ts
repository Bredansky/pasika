import tsParser from "@typescript-eslint/parser";
import { vi } from "vitest";
import { CwdAwareRuleTester, describe, ruleTester, srcFile } from "../rule-tester";
import { preferObjectDestructuringRule } from "./prefer-object-destructuring";

vi.setConfig({ testTimeout: 30_000 });

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

void describe("Properties stored in variables MUST use object destructuring unless the access must remain qualified to preserve a namespace or direct field mapping, the property name cannot be used as a compliant local identifier, or destructuring would conflict with an existing binding. When two or more properties are read from the same object identifier within the same block and no exception applies, they MUST be destructured together in one declaration.", () => {
  ruleTester.run("prefer-object-destructuring", preferObjectDestructuringRule, {
    valid: [
      "const { previewUrl } = file;",
      "const fileType = file.type;",
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
      "const first = config.current.first; use(first); const second = config.current.second;",
      "use(config.size);",
      "use(config.size); use(config.size);",
      "function dimensions(config) { return config.current.width * config.current.height; }",
      "const dimensions = (config) => config.width * config.height;",
      "const width = 1; function dimensions(config) { return config.width * config.height; }",
      "function render(layer) { if (layer.type) use(layer.type); const { color, type } = layer; use(color, type); }",
      "function render(position) { use(position.width, position.height); return (box) => { const { width, height } = box; return width + height; }; }",
      "function process(post) { use(post.id, post.currentPayload); return [1].map((id) => id); }",
    ],
    invalid: [
      {
        code: "const previewUrl = file.previewUrl;",
        output: "const { previewUrl } = file;",
        errors: [
          {
            message: `"previewUrl" is derived directly from "file.previewUrl". Use object destructuring. ${doc}`,
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
        output: ["const { first } = file;", "// keep separate", "const { second } = file;"].join("\n"),
        errors: [
          {
            message: `"first" is derived directly from "file.first". Use object destructuring. ${doc}`,
          },
          {
            message: `"second" is derived directly from "file.second". Use object destructuring. ${doc}`,
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
        output: "const { first } = file, { value } = other;",
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
