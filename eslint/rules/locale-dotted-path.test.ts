import { describe, ruleTester } from "../rule-tester";
import { localeDottedPathRule } from "./locale-dotted-path";

void describe("Code MUST import through `src/locales/index.ts` and use `locales.<key>` or `locales.<feature>.<key>` directly. User-facing text MUST NOT appear inline in JSX, props, toasts, or component dictionaries.", () => {
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
