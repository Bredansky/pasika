import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { localePlacementRule } from "./locale-placement";

const INDEX = [
  'import { global } from "./global";',
  'import { stream } from "./stream";',
  "export const locales = { ...global, stream } as const;",
].join(String.fromCharCode(10));

const FIXTURE: Record<string, string> = {
  "locales/index.ts": INDEX,
  "locales/global.ts": 'export const global = { cancel: "Cancel", nextStream: "Next stream" } as const;',
  "locales/stream.ts": 'export const stream = { watchLiveStream: "Watch Live" } as const;',
  "shared/button.tsx": 'import { locales } from "@/locales"; export const button = locales.cancel;',
  "compositions/stream-page-content.tsx":
    'import { locales } from "@/locales"; export const content = locales.nextStream;',
  "features/stream/player.tsx":
    'import { locales } from "@/locales"; export const player = locales.stream.watchLiveStream;',
};

function verify(overrides: Record<string, string | null> = {}, messages: RegExp[] = []): void {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-locale-flat-")));
  const files = { ...FIXTURE, ...overrides };
  for (const [name, contents] of Object.entries(files)) {
    if (contents === null) continue;
    const filePath = path.join(root, "src", name);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, contents);
  }
  process.chdir(root);
  const filename = path.join(root, "src/locales/index.ts");
  const code = files["locales/index.ts"] ?? INDEX;
  ruleTester.run("locale-placement", localePlacementRule, {
    valid: messages.length === 0 ? [{ filename, code }] : [],
    invalid:
      messages.length > 0
        ? [
            {
              filename,
              code,
              errors: messages.map((message) => ({ message })),
            },
          ]
        : [],
  });
}

void describe("User-facing text MUST be stored as static strings in flat dictionaries directly under `src/locales/`, with no nested objects, dynamic values, or unrelated declarations. Code MUST import through `src/locales/index.ts` and use `locales.<key>` or `locales.<feature>.<key>` instead of inline text in JSX, props, toasts, or component dictionaries.", () => {
  verify();
  verify({
    "compositions/stream-page-content.tsx":
      'import { locales } from "@/locales"; const note = "locales.stream.watchLiveStream"; export const content = locales.nextStream;',
  });
  verify({ "locales/global.ts": 'export const global = { cancel: { nested: "Bad" }, nextStream: "Next stream" };' }, [
    /Locale dictionary global has an invalid/,
    /Locale locales.cancel is not defined in the global dictionary/,
  ]);
  verify({ "locales/stream.ts": "export const stream = { watchLiveStream: getText() };" }, [
    /Locale dictionary stream has an invalid/,
    /Locale locales.stream.watchLiveStream is not defined in a feature dictionary/,
  ]);
  verify({ "locales/global.ts": 'export const global = { cancel: "Cancel" }, unrelated = "Unsafe";' }, [
    /Locale module .* must contain only an exported const global string dictionary/,
    /Locale locales.nextStream is not defined/,
    /Locale locales.cancel is not defined/,
  ]);
  verify({ "locales/features/legacy.ts": 'export const legacy = { label: "Old" };' }, [
    /Locale dictionaries must live directly in src\/locales\/; nested folder features is not allowed/,
  ]);
  verify(
    {
      "features/stream/player.tsx":
        'import { stream } from "@/locales/stream"; export const player = stream.watchLiveStream;',
    },
    [/Locale dictionaries must be imported through src\/locales\/index.ts/],
  );
  verify(
    {
      "shared/button.tsx": 'import { locales } from "@/locales"; export const button = locales.missing;',
    },
    [/Locale locales.missing is not defined in the global dictionary/],
  );
  verify(
    {
      "features/stream/player.tsx": 'import { locales } from "@/locales"; export const player = locales.stream;',
    },
    [/Locale access locales.stream must include a feature key/],
  );
});

void describe("Text used only in one feature MUST go in that feature's dictionary. Text used outside that feature MUST go in `global.ts`. Identical text MUST NOT appear in multiple dictionaries.", () => {
  verify({
    "locales/index.ts": INDEX.replace(
      "export const locales = { ...global, stream } as const;",
      `import { userSettings } from "./user-settings";
export const locales = { ...global, stream, userSettings } as const;`,
    ),
    "locales/user-settings.ts": 'export const userSettings = { saveChanges: "Save changes" } as const;',
    "features/user-settings/page.tsx":
      'import { locales } from "@/locales"; export const save = locales.userSettings.saveChanges;',
    "features/user-settings/another.tsx": 'import { locales } from "@/locales"; export const cancel = locales.cancel;',
  });
  verify(
    {
      "features/other/feed.tsx":
        'import { locales } from "@/locales"; export const feed = locales.stream.watchLiveStream;',
      "app/streams/page.tsx":
        'import { locales } from "@/locales"; export const metadata = { title: locales.stream.watchLiveStream };',
    },
    [/Locale locales.stream.watchLiveStream is used outside src\/features\/stream\/; move it into global/],
  );
  verify({
    "locales/index.ts": INDEX.replace(
      "export const locales = { ...global, stream } as const;",
      `import { credentials } from "./credentials";
export const locales = { ...global, stream, credentials } as const;`,
    ),
    "locales/credentials.ts": 'export const credentials = { delete: "Delete" } as const;',
    "features/credentials/delete.tsx":
      'import { locales } from "@/locales"; export const action = locales.credentials.delete;',
  });
  verify(
    {
      "locales/index.ts": INDEX.replace(
        "export const locales = { ...global, stream } as const;",
        `import { navigation } from "./navigation";
export const locales = { ...global, stream, navigation } as const;`,
      ),
      "locales/navigation.ts": 'export const navigation = { menuButton: "Open menu" } as const;',
      "app/dashboard/page.tsx":
        'import { locales } from "@/locales"; export const title = locales.navigation.menuButton;',
      "shared/navigation.tsx":
        'import { locales } from "@/locales"; export const label = locales.navigation.menuButton;',
    },
    [/Locale locales.navigation.menuButton is used outside src\/features\/navigation\/; move it into global/],
  );
  verify({
    "features/stream/second-player.tsx":
      'import { locales } from "@/locales"; export const second = locales.stream.watchLiveStream;',
  });
  verify({
    "features/stream/other.tsx": 'import { locales } from "@/locales"; export const next = locales.nextStream;',
    "features/credentials/other.tsx": 'import { locales } from "@/locales"; export const next = locales.nextStream;',
  });
  verify(
    {
      "shared/button.tsx": "",
      "compositions/stream-page-content.tsx": "",
      "features/stream/player.tsx": 'import { locales } from "@/locales"; export const next = locales.nextStream;',
    },
    [/Locale locales.nextStream is consumed only by src\/features\/stream\/; move it into that feature dictionary/],
  );
  verify(
    {
      "features/stream/player.tsx": "",
      "app/streams/page.tsx":
        'import { locales } from "@/locales"; export const title = locales.stream.watchLiveStream;',
    },
    [/Locale locales.stream.watchLiveStream is used outside src\/features\/stream\/; move it into global/],
  );
  verify(
    {
      "locales/index.ts": INDEX.replace(
        "export const locales = { ...global, stream } as const;",
        `import { editor } from "./editor";
export const locales = { ...global, stream, editor } as const;`,
      ),
      "locales/editor.ts": 'export const editor = { watchLiveStream: "Watch Live" } as const;',
      "features/editor/display.tsx":
        'import { locales } from "@/locales"; export const label = locales.editor.watchLiveStream;',
    },
    [
      /Locale text "Watch Live" is duplicated across dictionaries \(stream.watchLiveStream, editor.watchLiveStream\); reuse one global key/,
    ],
  );
  verify(
    {
      "locales/global.ts":
        'export const global = { cancel: "Cancel", nextStream: "Next stream", greeting: "Watch Live" } as const;',
    },
    [
      /Locale text "Watch Live" is duplicated across dictionaries \(global.greeting, stream.watchLiveStream\); reuse one global key/,
    ],
  );
});

void describe("`src/locales/index.ts` MUST import the dictionaries and export one `locales` object, with global keys at the top level and feature dictionaries under their camelCase names. It MUST NOT define translation strings directly.", () => {
  verify(
    {
      "locales/index.ts": INDEX.replace("{ ...global, stream }", '{ cancel: "Cancel", stream }'),
    },
    [
      /Locale index must expose feature dictionaries by name and spread only global/,
      /Locale index must spread the global dictionary/,
      /Imported locale dictionary global is not exposed/,
      /Locale locales.nextStream is not defined in the global dictionary/,
      /Locale locales.cancel is not defined in the global dictionary/,
    ],
  );
  verify({ "locales/index.ts": INDEX.replace("{ ...global, stream }", "{ global, stream }") }, [
    /Locale index must spread global keys into the top level/,
    /Locale index must spread the global dictionary/,
    /Imported locale dictionary global is not exposed/,
    /Locale locales.nextStream is not defined in the global dictionary/,
    /Locale locales.cancel is not defined in the global dictionary/,
  ]);
  verify({ "locales/index.ts": INDEX.replace("{ ...global, stream }", "{ ...stream, ...global }") }, [
    /Locale index may only spread the global dictionary/,
    /Imported locale dictionary stream is not exposed/,
    /Locale locales.stream.watchLiveStream is not defined in a feature dictionary/,
  ]);
  verify(
    { "locales/global.ts": 'export const global = { cancel: "Cancel", nextStream: "Next stream", stream: "Wrong" };' },
    [/Global locale key stream conflicts with a feature namespace/],
  );
  verify(
    {
      "locales/index.ts": INDEX.replace(
        "export const locales = { ...global, stream } as const;",
        "export const locales = { ...global, stream } as const, unrelated = 1;",
      ),
    },
    [
      /Locale index must export a single const locales dictionary/,
      /Locale locales.nextStream is not defined in the global dictionary/,
      /Locale locales.stream.watchLiveStream is not defined in a feature dictionary/,
      /Locale locales.cancel is not defined in the global dictionary/,
    ],
  );
  verify(
    {
      "locales/global.ts": null,
      "shared/button.tsx": "",
      "compositions/stream-page-content.tsx": "",
      "locales/index.ts": `import { stream } from "./stream";
export const locales = { stream } as const;`,
    },
    [/Locale index must spread the global dictionary/],
  );
  verify({ "locales/editor.ts": 'export const editor = { title: "Editor" };' }, [
    /Locale module editor.ts is not exposed in locales/,
  ]);
  verify(
    {
      "locales/index.ts": INDEX.replace(
        "export const locales = { ...global, stream } as const;",
        `import { shared } from "./shared";
import { compositions } from "./compositions";
export const locales = { ...global, stream, shared, compositions } as const;`,
      ),
      "locales/shared.ts": 'export const shared = { save: "Save" } as const;',
      "locales/compositions.ts": 'export const compositions = { save: "Save" } as const;',
    },
    [
      /Locale namespace shared must not be used as a catch-all dictionary/,
      /Locale namespace compositions must not be used as a catch-all dictionary/,
      /Imported locale dictionary shared is not exposed in locales/,
      /Imported locale dictionary compositions is not exposed in locales/,
    ],
  );
});

void describe("Locale keys MUST use English camelCase. Keys longer than 30 characters MUST describe the text's purpose and end with a WAI-ARIA role such as `Button`, `Link`, or `Dialog`.", () => {
  verify(
    {
      "locales/global.ts":
        'export const global = { "invalid-key": "Cancel", cancel: "Cancel", nextStream: "Next stream" };',
    },
    [/Locale dictionary global has an invalid/],
  );
});
