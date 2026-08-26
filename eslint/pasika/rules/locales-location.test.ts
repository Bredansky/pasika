import { describe, ruleTester } from "../rule-tester.js";
import { localesLocationRule } from "./locales-location.js";

void describe("All locales MUST live in the named locales object exported from src/locales/index.ts.", () => {
  ruleTester.run("locales-location", localesLocationRule, {
    valid: [
      {
        code: 'export const locales = { stream: { watchLiveStream: "Watch Live" } };',
        filename: "/project/src/locales/index.ts",
      },
      {
        code: 'const disabled = loading ? "opacity-50" : "opacity-100";',
        filename: "/project/src/features/stream/component.tsx",
      },
      {
        code: 'const page = { title: "Home" };',
        filename: "/project/src/app/page.tsx",
      },
      {
        code: 'export const config = { apiUrl: "https://api.example.com" };',
        filename: "/project/src/config/api/index.ts",
      },
    ],
    invalid: [
      {
        code: 'const messages = { title: "Welcome", description: "Hello" };',
        filename: "/project/src/features/home/home-page.tsx",
        errors: [
          {
            message: "User-facing strings must live in src/locales/, not inline in component files.",
          },
        ],
      },
    ],
  });
});
