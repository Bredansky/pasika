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
  "locales/global.ts": 'export const global = { cancel: "Cancel" } as const;',
  "locales/stream.ts": 'export const stream = { watchLiveStream: "Watch Live" } as const;',
  "shared/button.tsx": 'import { locales } from "@/locales"; export const button = locales.cancel;',
  "compositions/stream-page-content.tsx":
    'import { locales } from "@/locales"; export const content = locales.stream.watchLiveStream;',
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

void describe("User-facing locales MUST be defined as direct static string entries in named dictionaries under `src/locales/`: `global.ts` for context-independent UI labels and `<feature-name>.ts` for feature-owned text, with no nested objects, dynamic values, or unrelated declarations.", () => {
  verify();
  verify({ "locales/global.ts": 'export const global = { cancel: { nested: "Bad" } };' }, [
    /Locale dictionary global has an invalid/,
    /Locale locales.cancel is not defined in the global dictionary/,
  ]);
  verify({ "locales/stream.ts": "export const stream = { watchLiveStream: getText() };" }, [
    /Locale dictionary stream has an invalid/,
    /Locale locales.stream.watchLiveStream is not defined in a feature dictionary/,
    /Locale locales.stream.watchLiveStream is not defined in a feature dictionary/,
  ]);
  verify({ "locales/global.ts": 'export const global = { cancel: "Cancel" }, unrelated = "Unsafe";' }, [
    /Locale module .* must contain only an exported const global string dictionary/,
    /Locale locales.cancel is not defined/,
  ]);
  verify({ "locales/features/legacy.ts": 'export const legacy = { label: "Old" };' }, [
    /Locale dictionaries must live directly in src\/locales\/; nested folder features is not allowed/,
  ]);
});

void describe("Feature-specific copy MUST remain in its owning feature namespace regardless of where it is consumed; only context-independent UI labels MAY be global. Identical strings with independent meanings MUST remain separate.", () => {
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
  verify({
    "features/other/feed.tsx":
      'import { locales } from "@/locales"; export const feed = locales.stream.watchLiveStream;',
    "app/streams/page.tsx":
      'import { locales } from "@/locales"; export const metadata = { title: locales.stream.watchLiveStream };',
  });
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
});

void describe("`src/locales/index.ts` MUST assemble and export one `locales` object, spreading the `global` dictionary into top-level keys and exposing feature dictionaries by their camelCase names (e.g., `user-settings` → `userSettings`), without defining translation strings inline.", () => {
  verify(
    {
      "locales/index.ts": INDEX.replace("{ ...global, stream }", '{ cancel: "Cancel", stream }'),
    },
    [
      /Locale index must expose feature dictionaries by name and spread only global/,
      /Imported locale dictionary global is not exposed/,
      /Locale locales.cancel is not defined in the global dictionary/,
    ],
  );
  verify({ "locales/index.ts": INDEX.replace("{ ...global, stream }", "{ global, stream }") }, [
    /Locale index must spread global keys into the top level/,
    /Imported locale dictionary global is not exposed/,
    /Locale locales.cancel is not defined in the global dictionary/,
  ]);
  verify({ "locales/index.ts": INDEX.replace("{ ...global, stream }", "{ ...stream, ...global }") }, [
    /Locale index may only spread the global dictionary/,
    /Imported locale dictionary stream is not exposed/,
    /Locale locales.stream.watchLiveStream is not defined in a feature dictionary/,
    /Locale locales.stream.watchLiveStream is not defined in a feature dictionary/,
  ]);
  verify({ "locales/global.ts": 'export const global = { cancel: "Cancel", stream: "Wrong" };' }, [
    /Global locale key stream conflicts with a feature namespace/,
  ]);
  verify(
    {
      "locales/index.ts": INDEX.replace(
        "export const locales = { ...global, stream } as const;",
        "export const locales = { ...global, stream } as const, unrelated = 1;",
      ),
    },
    [
      /Locale index must export a single const locales dictionary/,
      /Locale locales.stream.watchLiveStream is not defined in a feature dictionary/,
      /Locale locales.stream.watchLiveStream is not defined in a feature dictionary/,
      /Locale locales.cancel is not defined in the global dictionary/,
    ],
  );
  verify({
    "locales/global.ts": null,
    "shared/button.tsx": "",
    "locales/index.ts": `import { stream } from "./stream";
export const locales = { stream } as const;`,
  });
  verify({ "locales/editor.ts": 'export const editor = { title: "Editor" };' }, [
    /Locale module editor.ts is not exposed in locales/,
  ]);
});

void describe("Consumers MUST import through `src/locales/index.ts` and read `locales.<key>` or `locales.<feature>.<key>` directly. User-facing strings outside `src/locales/` MUST use these paths instead of inline literals in JSX, props, toasts, or component dictionaries.", () => {
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

void describe("A locale key MUST be English camelCase. A direct translation longer than 30 characters MUST describe the message's purpose instead and end in a WAI-ARIA element role postfix such as `Button`, `Link`, or `Dialog`.", () => {
  verify({ "locales/global.ts": 'export const global = { "invalid-key": "Cancel", cancel: "Cancel" };' }, [
    /Locale dictionary global has an invalid/,
  ]);
});
