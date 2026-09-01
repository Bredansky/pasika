import { describe, ruleTester, srcFile } from "../rule-tester";
import { localeKeyShapeRule } from "./locale-key-shape";

const localesFile = srcFile("locales/index.ts");

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
