import { describe, ruleTester } from "../rule-tester";
import { preferObjectDestructuringRule } from "./prefer-object-destructuring";

const doc = "See docs/next-codebase-guide/rules/redundant-aliases-rule.md";

void describe("A local variable derived directly from an object property MUST use object destructuring.", () => {
  ruleTester.run("prefer-object-destructuring", preferObjectDestructuringRule, {
    valid: [
      "const { previewUrl } = file;",
      "const { type: fileType } = file;",
      "const value = getValue();",
      'const value = file["value"];',
      "const value: string = file.value;",
      "const value = file?.value;",
      "const errorMessage = locales.editor.missingRenderJobIds;",
      "const first = config.current.first; const second = config.current.second;",
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
        code: "const fileType = file.type;",
        output: "const { type: fileType } = file;",
        errors: [
          {
            message: `"fileType" is derived directly from "file.type". Use object destructuring. ${doc}`,
          },
        ],
      },
      {
        code: [
          "const previewUrl = file.previewUrl;",
          "const fileType = file.type;",
          "const fileId = file.id;",
          "const duration = file.duration;",
        ].join("\n"),
        output: "const { previewUrl, type: fileType, id: fileId, duration } = file;",
        errors: [
          {
            message: `"previewUrl", "fileType", "fileId", "duration" are derived directly from properties of "file". Use object destructuring. ${doc}`,
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
        code: "const first = file.first, otherValue = other.value;",
        output: "const { first } = file, { value: otherValue } = other;",
        errors: 2,
      },
    ],
  });
});
