import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { localePlacementRule } from "./locale-placement";

/**
 * The rule reads the whole tree from disk and reports on src/locales/index.ts,
 * so the fixture is a real project. Node runs each test file in its own
 * process, which makes the `chdir` below safe.
 */
const FIXTURE: Record<string, string> = {
  // "stream" is nested but read by two features; "acceptAllCookies" is
  // top-level and shared, which is correct.
  "locales/index.ts":
    'export const locales = {\n  stream: { watchLiveStream: "Дивитись прямий ефір" },\n  acceptAllCookies: "Прийняти всі cookies",\n};\n',
  "features/stream/stream-player.tsx":
    'import { locales } from "@/locales";\nexport function StreamPlayer() { return <span>{locales.stream.watchLiveStream}</span>; }\n',
  "features/other/feed.tsx":
    'import { locales } from "@/locales";\nexport function Feed() { return <span>{locales.stream.watchLiveStream}</span>; }\n',
  "features/cookies/cookie-banner.tsx":
    'import { locales } from "@/locales";\nexport function CookieBanner() { return <span>{locales.acceptAllCookies}</span>; }\n',
  "shared/consent-banner.tsx":
    'import { locales } from "@/locales";\nexport function ConsentBanner() { return <span>{locales.acceptAllCookies}</span>; }\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-locale-placement-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const DOC = "See docs/code-organization-guide/rules/locales-rule.md";

void describe(
  "Locales read by files in more than one feature folder or by src/shared/, src/compositions/, src/app/, or root support folders MUST live at the top level of locales.",
  () => {
    ruleTester.run("locale-placement", localePlacementRule, {
      valid: [
        // The rule reports on the locales index; a consumer file is untouched.
        {
          code: read("features/stream/stream-player.tsx"),
          filename: file("features/stream/stream-player.tsx"),
        },
      ],
      invalid: [
        {
          code: read("locales/index.ts"),
          filename: file("locales/index.ts"),
          errors: [
            {
              message:
              `Locale "stream" is read by src/features/other/feed.tsx, src/features/stream/stream-player.tsx and must live at the top level of locales. ${DOC}`,
            },
          ],
        },
      ],
    });
  },
);
