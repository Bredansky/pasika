import { describe, ruleTester, srcFile } from "../rule-tester";
import { localeKeyShapeRule } from "./locale-key-shape";

const sharedFile = srcFile("locales/shared.ts");
const compositionsFile = srcFile("locales/compositions.ts");
const featureFile = srcFile("locales/features/editor.ts");
const DOC = "See docs/next-codebase-guide/rules/locales-rule.md";

void describe("A locale dictionary MUST contain only direct static string entries, with no nested locale objects, dynamic expressions, or unrelated declarations.", () => {
  ruleTester.run("locale-key-shape-namespace-depth", localeKeyShapeRule, {
    valid: [
      { filename: sharedFile, code: 'export const shared = { cancel: "Cancel", save: "Save" } as const;' },
      { filename: compositionsFile, code: 'export const compositions = { confirmDelete: "Delete?" } as const;' },
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

void describe("A locale key MUST be English camelCase. A direct translation longer than 30 characters MUST describe the message's purpose instead and end in a WAI-ARIA element role postfix such as `Button`, `Link`, or `Dialog`.", () => {
  ruleTester.run("locale-key-shape", localeKeyShapeRule, {
    valid: [
      { filename: sharedFile, code: 'export const shared = { cancel: "Cancel", acceptAllCookies: "Accept" };' },
      { filename: compositionsFile, code: 'export const compositions = { confirmationDialog: "Continue?" };' },
      { filename: featureFile, code: 'export const editor = { accountDeletionConfirmationDialog: "Confirm" };' },
      {
        filename: featureFile,
        code: 'export const editor = { youSuccessfullySubscribedToUpdatesButton: "Subscribe" };',
      },
      { filename: featureFile, code: "export const editor = { greeting: `Hello` };" },
      {
        filename: srcFile("locales/features/user-settings.ts"),
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
        filename: sharedFile,
        code: 'export const shared = { Bad_Key: "Bad" };',
        errors: [{ message: `Locale key "Bad_Key" must be camelCase English based on the text. ${DOC}` }],
      },
      {
        filename: compositionsFile,
        code: 'export const compositions = { youSuccessfullySubscribedToUpdates: "Subscribed" };',
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
