import { describe, ruleTester } from "../rule-tester";
import { localeDottedPathRule } from "./locale-dotted-path";

void describe("User-facing text MUST be stored as static strings in flat dictionaries under `src/locales/`, with no nested objects, dynamic values, or unrelated declarations. Text used only in one feature MUST go in that feature's dictionary; all other text MUST go in `global.ts`, with no duplicate strings across dictionaries. Code MUST import through `src/locales/index.ts` and use `locales.<key>` or `locales.<feature>.<key>` instead of inline text in JSX, props, toasts, or component dictionaries.", () => {
  ruleTester.run("locale-dotted-path", localeDottedPathRule, {
    valid: [
      {
        code: "const title = locales.stream.watchLiveStream;",
        filename: "/project/src/features/stream/component.tsx",
      },
      {
        code: "const cancel = locales.cancel; const confirm = locales.stream.watchLiveStream;",
        filename: "/project/src/compositions/delete-dialog.tsx",
      },
      {
        code: "const { stream } = locales;",
        filename: "/project/src/locales/index.ts",
      },
    ],
    invalid: [
      {
        code: "const { watchLiveStream } = locales.stream;",
        filename: "/project/src/features/stream/component.tsx",
        errors: [
          {
            message: "Destructuring locales.watchLiveStream hides its key path; access locales directly instead.",
          },
        ],
      },
      {
        code: "const { title, description } = locales;",
        filename: "/project/src/features/home/home-page.tsx",
        errors: [
          {
            message: "Destructuring locales.title hides its key path; access locales directly instead.",
          },
          {
            message: "Destructuring locales.description hides its key path; access locales directly instead.",
          },
        ],
      },
    ],
  });
});
