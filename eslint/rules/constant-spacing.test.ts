import { describe, ruleTester, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const MESSAGE =
  "Consecutive single-line const declarations in a constants module must not have blank lines between them. " +
  "See docs/next-codebase-guide/rules/constants-rule.md";

const MULTILINE_MESSAGE =
  "Multiline const declarations in a constants module must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";

void describe("In constants modules, adjacent single-line constants with the same export visibility MUST have no blank line between them, and multiline constants MUST be separated from adjacent constants by a blank line; comments MAY separate groups.", () => {
  ruleTester.run("constant-casing", constantCasingRule, {
    valid: [
      {
        code: "export const first = defineApiContract({\n  method: method,\n});\n\nexport const second = defineApiContract({\n  method: method,\n});",
        filename: srcFile("constants/api-contracts.ts"),
      },
      {
        code: "export const first = getQuery(\n  key,\n);\n\nexport const second = key;",
        filename: srcFile("constants/api-contracts.ts"),
      },
      {
        code: "export const first = key;\n\nexport const second = getQuery(\n  key,\n);",
        filename: srcFile("constants/api-contracts.ts"),
      },
      {
        code: "export const first = getQuery(\n  key,\n);\n// Another group\nexport const second = key;",
        filename: srcFile("constants/api-contracts.ts"),
      },
      {
        code: 'export const telegramProxyFileIdQuery = "?file_id=";\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
      },
      {
        // The enum itself separates sections, and its members are not const declarations.
        code: 'export enum TelegramMediaKind { Photo = "photo" }\n\nexport const telegramProxyFileIdQuery = "?file_id=";',
        filename: srcFile("constants/telegram.ts"),
      },
      {
        // Explicit comments preserve intentional groups, even for related names.
        code: 'export const telegramProxyFileIdQuery = "?file_id=";\n\n// Proxy ID query option\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
      },
      {
        code: 'export const telegramProxyFileIdQuery = "?file_id=";\n/* A second group */\n\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
      },
      {
        // Different visibility is a meaningful boundary.
        code: 'const telegramProxyFileIdQuery = "?file_id=";\n\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
      },
      {
        // Similar names in utility modules are not necessarily grouped constants.
        code: 'const telegramProxyFileIdQuery = "?file_id=";\n\nconst telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("utils/telegram.ts"),
      },
      {
        // Multiple declarators and destructuring are deliberately excluded.
        code: 'export const telegramProxyFileIdQuery = "?file_id=", telegramProxyFileIdOther = "x";\n\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
      },
      {
        code: 'export const { telegramProxyFileIdQuery } = config;\n\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
      },
      {
        code: 'export const telegramProxyFileIdQuery = "?file_id=";\n\nexport function telegramProxyFileIdQueryKey() {}',
        filename: srcFile("constants/telegram.ts"),
      },
    ],
    invalid: [
      {
        code: "export const first = defineApiContract({\n  method: method,\n});\nexport const second = defineApiContract({\n  method: method,\n});",
        output:
          "export const first = defineApiContract({\n  method: method,\n});\n\nexport const second = defineApiContract({\n  method: method,\n});",
        filename: srcFile("constants/api-contracts.ts"),
        errors: [{ message: MULTILINE_MESSAGE }],
      },
      {
        code: "export const first = getQuery(\n  key,\n);\nexport const second = key;",
        output: "export const first = getQuery(\n  key,\n);\n\nexport const second = key;",
        filename: srcFile("constants/api-contracts.ts"),
        errors: [{ message: MULTILINE_MESSAGE }],
      },
      {
        code: "export const first = key;\nexport const second = getQuery(\n  key,\n);",
        output: "export const first = key;\n\nexport const second = getQuery(\n  key,\n);",
        filename: srcFile("constants/api-contracts.ts"),
        errors: [{ message: MULTILINE_MESSAGE }],
      },
      {
        code: "const first = getQuery(\r\n  key,\r\n);\r\nexport const second = key;",
        output: "const first = getQuery(\r\n  key,\r\n);\r\n\r\nexport const second = key;",
        filename: srcFile("constants/api-contracts.ts"),
        errors: [{ message: MULTILINE_MESSAGE }],
      },
      {
        // Names have no bearing on spacing: unrelated exports are still adjacent const declarations.
        code: 'export const telegramProxyFileIdQuery = "?file_id=";\n\nexport const telegramRelativeUrlBase = "http://localhost";',
        output:
          'export const telegramProxyFileIdQuery = "?file_id=";\nexport const telegramRelativeUrlBase = "http://localhost";',
        filename: srcFile("constants/telegram.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        // Prefix similarity is neither required nor consulted.
        code: "export const maximumWidth = 100;\n\nexport const maximumHeight = 200;",
        output: "export const maximumWidth = 100;\nexport const maximumHeight = 200;",
        filename: srcFile("constants/layout.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        // The real-world case that was missed by name-based heuristics.
        code: 'export const zeroCharacters = 0;\n\nexport const ellipsis = "…";',
        output: 'export const zeroCharacters = 0;\nexport const ellipsis = "…";',
        filename: srcFile("constants/text.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'export const telegramProxyFileIdQuery = "?file_id=";\n\nexport const telegramProxyFileIdQueryKey = "file_id";',
        output:
          'export const telegramProxyFileIdQuery = "?file_id=";\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: "const primaryTelegramMediaIndex = 0;\n\nconst primaryTelegramMediaCount = 2;",
        output: "const primaryTelegramMediaIndex = 0;\nconst primaryTelegramMediaCount = 2;",
        filename: srcFile("features/publishing/constants/media.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'export const proxyTelegramFileIdQuery = "?file_id=";\n\n\nexport const proxyTelegramFileIdQueryKey = "file_id";',
        output:
          'export const proxyTelegramFileIdQuery = "?file_id=";\nexport const proxyTelegramFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'export const telegramProxyFileIdQuery = "?file_id=";\r\n\r\nexport const telegramProxyFileIdQueryKey = "file_id";',
        output:
          'export const telegramProxyFileIdQuery = "?file_id=";\r\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: '  const telegramProxyFileIdQuery = "?file_id=";\n  \n  const telegramProxyFileIdQueryKey = "file_id";',
        output: '  const telegramProxyFileIdQuery = "?file_id=";\n  const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
