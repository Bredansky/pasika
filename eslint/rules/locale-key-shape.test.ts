import { describe, ruleTester, srcFile } from "../rule-tester";
import { localeKeyShapeRule } from "./locale-key-shape";

const localesFile = srcFile("locales/index.ts");

void describe("A feature locale namespace MUST contain string entries directly and MUST NOT contain nested locale objects.", () => {
  ruleTester.run("locale-key-shape-namespace-depth", localeKeyShapeRule, {
    valid: [
      {
        code: 'export const locales = { cancel: "Cancel", editor: { drafts: "Drafts", draftStatusNew: "New" } } as const;',
        filename: localesFile,
      },
      {
        code: 'export const locales = { editor: { draftStatusNew: "New" } } as const satisfies Record<string, unknown>;',
        filename: localesFile,
      },
      {
        code: 'const unrelated = { editor: { draftStatuses: { new: "New" } } };',
        filename: localesFile,
      },
      {
        code: 'export const locales = { editor: { draftStatuses: { new: "New" } } };',
        filename: srcFile("constants/locales.ts"),
      },
    ],
    invalid: [
      {
        code: 'export const locales = { editor: { draftStatuses: { new: "New" } } };',
        filename: localesFile,
        errors: [
          {
            message:
              'Locale "editor.draftStatuses" must not be a nested object. Keep string keys directly inside the "editor" feature namespace. See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
      {
        code: 'export const locales = { editor: { draftStatuses: { new: "New" } } } as const;',
        filename: localesFile,
        errors: [
          {
            message:
              'Locale "editor.draftStatuses" must not be a nested object. Keep string keys directly inside the "editor" feature namespace. See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
      {
        code: 'export const locales = { editor: { draftStatuses: { new: "New" } } } as const satisfies Record<string, unknown>;',
        filename: localesFile,
        errors: [
          {
            message:
              'Locale "editor.draftStatuses" must not be a nested object. Keep string keys directly inside the "editor" feature namespace. See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
      {
        code: 'export const locales = { editor: { draftStatuses: { new: "New" }, groups: { old: "Old" } } };',
        filename: localesFile,
        errors: [
          {
            message:
              'Locale "editor.draftStatuses" must not be a nested object. Keep string keys directly inside the "editor" feature namespace. See docs/next-codebase-guide/rules/locales-rule.md',
          },
          {
            message:
              'Locale "editor.groups" must not be a nested object. Keep string keys directly inside the "editor" feature namespace. See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
    ],
  });
});

void describe("A locale key MUST be English camelCase. A direct translation longer than 30 characters MUST describe the message's purpose instead and end in a WAI-ARIA element role postfix such as `Button`, `Link`, or `Dialog`.", () => {
  ruleTester.run("locale-key-shape", localeKeyShapeRule, {
    valid: [
      // Short text-based keys, top-level and namespaced.
      {
        code: 'export const locales = { watchLiveStream: "Дивитись прямий ефір", acceptAllCookies: "Прийняти всі cookies" };',
        filename: localesFile,
      },
      {
        code: 'export const locales = { stream: { watchLiveStream: "Дивитись прямий ефір" } };',
        filename: localesFile,
      },
      // A long key that is purpose-based ends in an element role.
      {
        code: 'export const locales = { accountDeletionConfirmationDialog: "Ви дійсно хочете видалити обліковий запис?" };',
        filename: localesFile,
      },
      {
        code: 'export const locales = { youSuccessfullySubscribedToUpdatesButton: "Підписатися" };',
        filename: localesFile,
      },
    ],
    invalid: [
      // Not English: written with a non-Latin alphabet.
      {
        code: 'export const locales = { стрим: "Дивитись прямий ефір" };',
        filename: localesFile,
        errors: [
          {
            message:
              'Locale key "стрим" must be English; write it in the Latin alphabet. See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
      // Not camelCase: describes the element with a separator or casing that is not camelCase.
      {
        code: 'export const locales = { watch_live_stream: "Дивитись прямий ефір" };',
        filename: localesFile,
        errors: [
          {
            message:
              'Locale key "watch_live_stream" must be camelCase English based on the text. See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
      {
        code: 'export const locales = { WatchLiveStream: "Дивитись прямий ефір" };',
        filename: localesFile,
        errors: [
          {
            message:
              'Locale key "WatchLiveStream" must be camelCase English based on the text. See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
      // Key shape is checked even when the locales literal uses `as const`.
      {
        code: 'export const locales = { editor: { Bad_Key: "Bad" } } as const;',
        filename: localesFile,
        errors: [
          {
            message:
              'Locale key "Bad_Key" must be camelCase English based on the text. See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
      // A long key that is a direct translation, not purpose-based.
      {
        code: 'export const locales = { youSuccessfullySubscribedToUpdates: "Ви успішно підписалися на оновлення" };',
        filename: localesFile,
        errors: [
          {
            message:
              'Locale key "youSuccessfullySubscribedToUpdates" is longer than 30 characters, so it must describe ' +
              'the message\'s purpose instead of the text; end it with an element role such as "Button", ' +
              '"Link", or "Dialog" (see WAI-ARIA roles). See docs/next-codebase-guide/rules/locales-rule.md',
          },
        ],
      },
    ],
  });
});
