import { describe, ruleTester, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const MESSAGE =
  "Consecutive related const declarations in a constants module must not have blank lines between them. " +
  "See docs/next-codebase-guide/rules/constants-rule.md";

void describe("Consecutive related `const` declarations in a `constants/` module MUST NOT be separated by blank lines; comments and different declaration kinds MAY separate semantic groups.", () => {
  ruleTester.run("constant-casing", constantCasingRule, {
    valid: [
      {
        code: 'export const telegramProxyFileIdQuery = "?file_id=";\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
      },
      {
        // An unrelated Telegram domain is not a reason to collapse sections.
        code: 'export const telegramProxyFileIdQuery = "?file_id=";\n\nexport const telegramRelativeUrlBase = "http://localhost";',
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
        // One-word prefix is not a sufficiently specific domain.
        code: "export const maximumWidth = 100;\n\nexport const maximumHeight = 200;",
        filename: srcFile("constants/layout.ts"),
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
      {
        code: 'export const telegramProxyFileIdQuery = getQuery(\n  "file_id",\n);\n\nexport const telegramProxyFileIdQueryKey = "file_id";',
        output:
          'export const telegramProxyFileIdQuery = getQuery(\n  "file_id",\n);\nexport const telegramProxyFileIdQueryKey = "file_id";',
        filename: srcFile("constants/telegram.ts"),
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
