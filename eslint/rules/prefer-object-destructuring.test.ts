import { describe, ruleTester } from "../rule-tester";
import { preferObjectDestructuringRule } from "./prefer-object-destructuring";

const doc = "See docs/next-codebase-guide/rules/redundant-aliases-rule.md";

void describe("Properties stored in variables MUST use object destructuring. When two or more properties of the same object are read in one scope, they MUST be destructured together in one declaration.", () => {
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
      "const first = config.current.first; use(first); const second = config.current.second;",
      "use(config.size);",
      "use(config.size); use(config.size);",
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
        output: null,
        errors: [
          {
            message: `"emoji", "fontSize", "background", "size" are read from "config" in the same scope. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
      {
        code: ["function dimensions(config) {", "  return config.width * config.height;", "}"].join("\n"),
        output: null,
        errors: [
          {
            message: `"width", "height" are read from "config" in the same scope. Destructure them together in one declaration. ${doc}`,
          },
        ],
      },
    ],
  });
});
