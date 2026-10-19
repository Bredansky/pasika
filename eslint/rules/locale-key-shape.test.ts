import { describe, ruleTester, srcFile } from "../rule-tester";
import { localeKeyShapeRule } from "./locale-key-shape";

const globalFile = srcFile("locales/global.ts");
const navigationFile = srcFile("locales/navigation.ts");
const featureFile = srcFile("locales/editor.ts");
const DOC = "See docs/next-codebase-guide/rules/locales-rule.md";

void describe("User-facing text MUST be stored as static strings in flat dictionaries under `src/locales/`, with no nested objects, dynamic values, or unrelated declarations. Text used only in one feature MUST go in that feature's dictionary; all other text MUST go in `global.ts`, with no duplicate strings across dictionaries. Code MUST import through `src/locales/index.ts` and use `locales.<key>` or `locales.<feature>.<key>` instead of inline text in JSX, props, toasts, or component dictionaries.", () => {
  ruleTester.run("locale-key-shape-namespace-depth", localeKeyShapeRule, {
    valid: [
      { filename: globalFile, code: 'export const global = { cancel: "Cancel", save: "Save" } as const;' },
      { filename: navigationFile, code: 'export const navigation = { confirmDelete: "Delete?" } as const;' },
      { filename: featureFile, code: 'export const editor = { drafts: "Drafts" } as const;' },
    ],
    invalid: [
      {
        filename: featureFile,
        code: 'export const editor = { draftStatuses: { new: "New" } } as const;',
        errors: [
          {
            message: `Locale "editor.draftStatuses" must not be a nested object. Keep string keys directly inside the "editor" namespace. ${
              DOC
            }`,
          },
        ],
      },
    ],
  });
});

void describe("Locale keys MUST use English camelCase. Keys longer than 30 characters MUST describe the text's purpose and end with a WAI-ARIA role such as `Button`, `Link`, or `Dialog`.", () => {
  ruleTester.run("locale-key-shape", localeKeyShapeRule, {
    valid: [
      { filename: globalFile, code: 'export const global = { cancel: "Cancel", acceptAllCookies: "Accept" };' },
      { filename: navigationFile, code: 'export const navigation = { confirmationDialog: "Continue?" };' },
      { filename: featureFile, code: 'export const editor = { accountDeletionConfirmationDialog: "Confirm" };' },
      {
        filename: featureFile,
        code: 'export const editor = { youSuccessfullySubscribedToUpdatesButton: "Subscribe" };',
      },
      { filename: featureFile, code: "export const editor = { greeting: `Hello` };" },
      {
        filename: srcFile("locales/user-settings.ts"),
        code: 'export const userSettings = { saveChanges: "Save changes" };',
      },
    ],
    invalid: [
      {
        filename: featureFile,
        code: 'export const editor = { стрим: "Watch" };',
        errors: [{ message: `Locale key "стрим" must be English; write it in the Latin alphabet. ${DOC}` }],
      },
      {
        filename: featureFile,
        code: 'export const editor = { watch_live_stream: "Watch" };',
        errors: [{ message: `Locale key "watch_live_stream" must be camelCase English based on the text. ${DOC}` }],
      },
      {
        filename: globalFile,
        code: 'export const global = { Bad_Key: "Bad" };',
        errors: [{ message: `Locale key "Bad_Key" must be camelCase English based on the text. ${DOC}` }],
      },
      {
        filename: navigationFile,
        code: 'export const navigation = { youSuccessfullySubscribedToUpdates: "Subscribed" };',
        errors: [
          {
            message:
              `Locale key "youSuccessfullySubscribedToUpdates" is longer than 30 characters, so it must describe ` +
              `the message's purpose instead of the text; end it with an element role such as "Button", ` +
              `"Link", or "Dialog" (see WAI-ARIA roles). ${DOC}`,
          },
        ],
      },
    ],
  });
});
