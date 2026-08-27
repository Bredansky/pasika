import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester.js";
import { localePlacementRule } from "./locale-placement.js";

/**
 * The rule reads the whole tree from disk and reports on src/locales/index.ts,
 * so the fixture is a real project. Node runs each test file in its own
 * process, which makes the `chdir` below safe.
 */
const FIXTURE: Record<string, string> = {
  // "watchLiveStream" is read only by the stream feature but lives at the top
  // level; "chatInput" is namespaced under the stream object, which is correct.
  "locales/index.ts":
    'export const locales = {\n  watchLiveStream: "Дивитись прямий ефір",\n  stream: { chatInput: "Повідомлення" },\n};\n',
  "features/stream/stream-player.tsx":
    'import { locales } from "@/locales";\nexport function StreamPlayer() { return <span>{locales.watchLiveStream}</span>; }\n',
  "features/stream/stream-chat.tsx":
    'import { locales } from "@/locales";\nexport function StreamChat() { return <span>{locales.stream.chatInput}</span>; }\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-locale-namespaced-")));
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
  "Locales read only by files in one feature folder MUST live in an object with the camelCase form of its feature folder name (for example, user-settings becomes userSettings).",
  () => {
    ruleTester.run("locale-placement", localePlacementRule, {
      valid: [
        // A correctly namespaced key produces no report; the consumer file is
        // also untouched because the rule reports on the locales index.
        {
          code: read("features/stream/stream-chat.tsx"),
          filename: file("features/stream/stream-chat.tsx"),
        },
      ],
      invalid: [
        {
          code: read("locales/index.ts"),
          filename: file("locales/index.ts"),
          errors: [
            {
              message:
              `Locale "watchLiveStream" is read only by the stream feature; it must live in an object named "stream". ${DOC}`,
            },
          ],
        },
      ],
    });
  },
);
