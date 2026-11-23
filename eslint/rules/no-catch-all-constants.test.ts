import { describe, ruleTester, srcFile } from "../rule-tester";
import { noCatchAllConstantsRule } from "./no-catch-all-constants";

const mixed = [
  'export const authSessionLoadingStatus = "loading";',
  'export const cookieSeparator = ";";',
  'export const credentialLoggerName = "PlatformCredentials";',
  'export const editorTokenHashAlgorithm = "sha256";',
  'export const mediaBucket = "media";',
  'export const platformCredentialsTableName = "platform_credentials";',
  'export const previewEnvironmentName = "preview";',
  'export const telegramInputMediaVideoKind = "video";',
  'export const telegramProxyFileIdQuery = "?file_id=";',
  'export const telegramProxyFileIdQueryKey = "file_id";',
  'export const userAccountUserIdColumn = "user_id";',
].join("\n");

void describe("A generically named constants module with many exported values from distinct naming domains MUST be split into cohesive, domain-named modules.", () => {
  ruleTester.run("no-catch-all-constants", noCatchAllConstantsRule, {
    valid: [
      {
        filename: srcFile("constants/telegram-values.ts"),
        code: [
          'export const telegramParseMode = "MarkdownV2";',
          'export const telegramProxyPath = "/proxy";',
          'export const telegramFileId = "file_id";',
          "export const telegramRetryCount = 3;",
          "export const telegramTimeoutMs = 100;",
          'export const telegramRequestType = "sendMessage";',
          'export const telegramMediaType = "photo";',
        ].join("\n"),
      },
      {
        filename: srcFile("constants/service-values.ts"),
        code: mixed.split("\n").slice(0, 5).join("\n"),
      },
      {
        filename: srcFile("constants/api-contracts.ts"),
        code: mixed,
      },
      {
        filename: srcFile("constants/index.ts"),
        code: mixed,
      },
      {
        filename: srcFile("features/publishing/utils/service-values.ts"),
        code: mixed,
      },
      {
        filename: srcFile("constants/service-values.ts"),
        code: [
          'const authSessionLoadingStatus = "loading";',
          'const cookieSeparator = ";";',
          'const credentialLoggerName = "PlatformCredentials";',
          'const editorTokenHashAlgorithm = "sha256";',
          'const mediaBucket = "media";',
          'const platformCredentialsTableName = "platform_credentials";',
          'export const previewEnvironmentName = "preview";',
          'export const telegramInputMediaVideoKind = "video";',
        ].join("\n"),
      },
    ],
    invalid: [
      {
        filename: srcFile("constants/service-values.ts"),
        code: mixed,
        errors: [
          {
            message: /Likely catch-all constants module "service-values.ts": 11 exported values span 9 naming domains/,
          },
        ],
      },
      {
        filename: srcFile("constants/common.ts"),
        code: [
          'export enum AuthStatusEnum { Loading = "loading" }',
          'export enum CookieSameSiteEnum { Lax = "lax" }',
          'export const credentialLogger = "credential";',
          'export const storageBucket = "media";',
          'export const telegramQuery = "file_id";',
          'export const previewEnvironment = "preview";',
          'export const editorAlgorithm = "sha256";',
        ].join("\n"),
        errors: 1,
      },
      {
        filename: srcFile("features/publishing/constants/shared.ts"),
        code: [
          'export const authLoading = "loading";',
          'export const cookieSeparator = ";";',
          'export const credentialLogger = "credential";',
          'export const storageBucket = "media";',
          'export const telegramQuery = "file_id";',
          'export const previewEnvironment = "preview";',
          'export const editorAlgorithm = "sha256";',
        ].join("\n"),
        errors: 1,
      },
    ],
  });
});
