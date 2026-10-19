import { describe, ruleTester } from "../rule-tester";
import { localeDottedPathRule } from "./locale-dotted-path";

void describe("Consumers MUST import through `src/locales/index.ts` and use full `locales.<namespace>.<key>` paths. User-facing strings outside `src/locales/` MUST use these paths instead of inline literals in JSX, props, toasts, or component dictionaries.", () => {
  ruleTester.run("locale-dotted-path", localeDottedPathRule, {
    valid: [
      {
        code: "const title = locales.stream.watchLiveStream;",
        filename: "/project/src/features/stream/component.tsx",
      },
      {
        code: "const cancel = locales.shared.cancel; const confirm = locales.compositions.confirmDelete;",
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
            message:
              "Destructuring locales.watchLiveStream loses the namespace; read through the full dotted path instead.",
          },
        ],
      },
      {
        code: "const { title, description } = locales;",
        filename: "/project/src/features/home/home-page.tsx",
        errors: [
          {
            message: "Destructuring locales.title loses the namespace; read through the full dotted path instead.",
          },
          {
            message:
              "Destructuring locales.description loses the namespace; read through the full dotted path instead.",
          },
        ],
      },
    ],
  });
});
