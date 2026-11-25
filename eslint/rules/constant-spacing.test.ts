import { describe, ruleTester, srcFile } from "../rule-tester";
import { constantCasingRule } from "./constant-casing";

const MESSAGE =
  "Consecutive single-line const declarations must not have blank lines between them. " +
  "See docs/next-codebase-guide/rules/constants-rule.md";

const MULTILINE_MESSAGE =
  "Multiline const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";

const ENUM_MESSAGE =
  "Const and enum declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";

void describe("In source modules, adjacent single-line constants with the same export visibility MUST have no blank line between them, and multiline constants MUST be separated from adjacent constants by a blank line; const and enum declarations MUST be separated by a blank line; comments MAY separate groups.", () => {
  ruleTester.run("constant-casing", constantCasingRule, {
    valid: [
      {
        code: 'const selectTriggerSlot = "select-trigger";\n\nenum SelectTriggerSize {\n  Small = "sm",\n  Default = "default",\n}',
        filename: srcFile("shared/select.tsx"),
      },
      {
        code: 'enum SelectTriggerSize { Small = "sm" }\n\nconst selectTriggerSlot = "select-trigger";',
        filename: srcFile("shared/select.tsx"),
      },
      {
        code: 'const selectTriggerSlot = "select-trigger";\n// Size options\nenum SelectTriggerSize { Small = "sm" }',
        filename: srcFile("shared/select.tsx"),
      },
      {
        code: 'enum SelectTriggerSize { Small = "sm" }\nenum SelectContentSize { Large = "lg" }',
        filename: srcFile("shared/select.tsx"),
      },
      {
        code: "const first = 1;\nconst second = 2;",
        filename: srcFile("features/auth/utils/e2e-session.ts"),
      },
      {
        code: "function run() {\n  const first = 1;\n\n  const second = 2;\n}",
        filename: srcFile("features/auth/utils/e2e-session.ts"),
      },
      {
        code: "const first = 1;\n\n// Separate group\nconst second = 2;",
        filename: srcFile("features/auth/utils/e2e-session.ts"),
      },
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
        code: 'const selectTriggerSlot = "select-trigger";\nenum SelectTriggerSize {\n  Small = "sm",\n  Default = "default",\n}',
        output:
          'const selectTriggerSlot = "select-trigger";\n\nenum SelectTriggerSize {\n  Small = "sm",\n  Default = "default",\n}',
        filename: srcFile("shared/select.tsx"),
        errors: [{ message: ENUM_MESSAGE }],
      },
      {
        code: 'enum SelectTriggerSize { Small = "sm" }\nconst selectTriggerSlot = "select-trigger";',
        output: 'enum SelectTriggerSize { Small = "sm" }\n\nconst selectTriggerSlot = "select-trigger";',
        filename: srcFile("shared/select.tsx"),
        errors: [{ message: ENUM_MESSAGE }],
      },
      {
        code: 'export const selectTriggerSlot = "select-trigger";\r\nexport enum SelectTriggerSize { Small = "sm" }',
        output:
          'export const selectTriggerSlot = "select-trigger";\r\n\r\nexport enum SelectTriggerSize { Small = "sm" }',
        filename: srcFile("shared/select.tsx"),
        errors: [{ message: ENUM_MESSAGE }],
      },
      {
        code: 'const selectTriggerSlot = getSlot(\n  "select-trigger",\n);\nexport enum SelectTriggerSize { Small = "sm" }',
        output:
          'const selectTriggerSlot = getSlot(\n  "select-trigger",\n);\n\nexport enum SelectTriggerSize { Small = "sm" }',
        filename: srcFile("shared/select.tsx"),
        errors: [{ message: ENUM_MESSAGE }],
      },
      {
        code: 'const e2eSessionCookieName = "next-auth.session-token";\n\nconst e2eSessionMaxAgeSeconds = 86_400;\n\nconst e2eSessionUserId = "test-user-id";\n\nconst e2eSessionJwtId = "test-jwt-id";\n\nconst e2eSessionCookieSameSite = "lax";',
        output:
          'const e2eSessionCookieName = "next-auth.session-token";\nconst e2eSessionMaxAgeSeconds = 86_400;\nconst e2eSessionUserId = "test-user-id";\nconst e2eSessionJwtId = "test-jwt-id";\nconst e2eSessionCookieSameSite = "lax";',
        filename: srcFile("features/auth/utils/e2e-session.ts"),
        errors: Array.from({ length: 4 }, () => ({ message: MESSAGE })),
      },
      {
        code: "const first = 1;\nconst second = {\n  value: 2,\n};",
        output: "const first = 1;\n\nconst second = {\n  value: 2,\n};",
        filename: srcFile("features/auth/hooks/use-session.ts"),
        errors: [{ message: MULTILINE_MESSAGE }],
      },
      {
        code: "const first = 1;\n\nconst second = 2;",
        output: "const first = 1;\nconst second = 2;",
        filename: srcFile("features/auth/session.tsx"),
        errors: [{ message: MESSAGE }],
      },
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
