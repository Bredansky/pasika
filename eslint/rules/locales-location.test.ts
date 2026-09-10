import { describe, ruleTester } from "../rule-tester";
import { localesLocationRule } from "./locales-location";

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
      // Lowercase enum-token values are data, not display prose.
      {
        code: 'export const defaultPreferences = { format: "post_45", variant: "carousel" };',
        filename: "/project/src/constants/index.ts",
      },
      // Numeric/boolean values are never display prose.
      {
        code: "export const thresholds = { near: 14, snap: 8 };",
        filename: "/project/src/features/canvas/thresholds.ts",
      },
      // Space-separated CSS class strings are data, not prose, despite the space.
      {
        code: 'export const textStyles = { classic: "leading-none font-semibold text-white" };',
        filename: "/project/src/features/editor/text-styles.ts",
      },
      // MIME-type and ID-like lowercase values are data, not prose.
      {
        code: 'export const extensionByContentType = { "image/jpeg": "jpg" };',
        filename: "/project/src/utils/storage.ts",
      },
      // Test fixtures hold arbitrary data, not text a component renders.
      {
        code: 'const baseLayer = { content: "Hello World" };',
        filename: "/project/src/features/editor/layers-utils.test.ts",
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
      // Uppercase-first-letter prose is flagged even for non-Latin scripts.
      {
        code: 'const messages = { greeting: "Привіт" };',
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
