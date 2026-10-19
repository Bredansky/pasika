import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { localePlacementRule } from "./locale-placement";

const INDEX = [
  'import { shared } from "./shared";',
  'import { compositions } from "./compositions";',
  'import { stream } from "./features/stream";',
  "export const locales = { shared, compositions, stream } as const;",
].join("\n");

const FIXTURE: Record<string, string> = {
  "locales/index.ts": INDEX,
  "locales/shared.ts": 'export const shared = { cancel: "Cancel" } as const;',
  "locales/compositions.ts": 'export const compositions = { confirmDelete: "Delete this item?" } as const;',
  "locales/features/stream.ts": 'export const stream = { watchLiveStream: "Watch Live" } as const;',
  "shared/button.tsx": 'import { locales } from "@/locales"; export const button = locales.shared.cancel;',
  "compositions/dialog.tsx":
    'import { locales } from "@/locales"; export const dialog = locales.compositions.confirmDelete;',
  "features/stream/player.tsx":
    'import { locales } from "@/locales"; export const player = locales.stream.watchLiveStream;',
};

function verify(overrides: Record<string, string> = {}, messages: RegExp[] = []): void {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-locale-namespace-")));
  const files = { ...FIXTURE, ...overrides };
  for (const [name, contents] of Object.entries(files)) {
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

void describe("All locales MUST be defined in named string dictionaries at `src/locales/shared.ts`, `src/locales/compositions.ts`, or `src/locales/features/<feature-name>.ts`, imported into and exposed by the exported `locales` object in `src/locales/index.ts`.", () => {
  verify();
  verify({ "locales/shared.ts": 'export const shared = { cancel: { nested: "Bad" } };' }, [
    /Locale dictionary shared has an invalid/,
    /Locale locales.shared.cancel is not defined/,
  ]);
});

void describe("The `locales` object MUST expose `shared` and `compositions` as distinct namespaces, and MUST NOT spread their entries into the top level.", () => {
  verify(
    { "locales/index.ts": INDEX.replace("{ shared, compositions, stream }", "{ ...shared, compositions, stream }") },
    [
      /without spreads or aliases/,
      /Locale index must expose the shared namespace/,
      /Imported locale dictionary shared is not exposed/,
      /Locale locales.shared.cancel is not defined/,
    ],
  );
});

void describe("Locales read only by files in one feature folder MUST live in a dictionary named after the camelCase form of that feature folder (for example, `user-settings` becomes `userSettings`).", () => {
  verify({
    "locales/index.ts": INDEX.replace(
      "export const locales = { shared, compositions, stream } as const;",
      'import { userSettings } from "./features/user-settings";\nexport const locales = { shared, compositions, stream, userSettings } as const;',
    ),
    "locales/features/user-settings.ts": 'export const userSettings = { saveChanges: "Save changes" } as const;',
    "features/user-settings/page.tsx":
      'import { locales } from "@/locales"; export const save = locales.userSettings.saveChanges;',
  });
  verify(
    {
      "shared/button.tsx": "",
      "features/stream/cancel.tsx": 'import { locales } from "@/locales"; export const cancel = locales.shared.cancel;',
    },
    [/Locale shared.cancel is read by .* and must live in the stream namespace/],
  );
});

void describe("Locales read only by files under `src/compositions/` MUST live in the `compositions` dictionary.", () => {
  verify(
    {
      "shared/button.tsx": "",
      "compositions/cancel.tsx": 'import { locales } from "@/locales"; export const cancel = locales.shared.cancel;',
    },
    [/Locale shared.cancel is read by .* and must live in the compositions namespace/],
  );
});

void describe("Locales read by files in more than one consumer scope or by `src/shared/`, `src/app/`, `src/config/`, or root support folders MUST live in the `shared` dictionary.", () => {
  verify(
    {
      "features/other/feed.tsx":
        'import { locales } from "@/locales"; export const feed = locales.stream.watchLiveStream;',
    },
    [/Locale stream.watchLiveStream is read by .* and must live in the shared namespace/],
  );
});

void describe("A namespaced locale MUST be read through its full dotted path (`locales.<namespace>.<key>`).", () => {
  verify(
    {
      "shared/button.tsx": 'import { locales } from "@/locales"; export const button = locales.cancel;',
    },
    [/Locale access locales.cancel must use a namespace and key/],
  );
});

void describe("Consumers MUST import translations through `src/locales/index.ts`, not directly from dictionary modules.", () => {
  verify(
    {
      "features/stream/player.tsx":
        'import { stream } from "@/locales/features/stream"; export const player = stream.watchLiveStream;',
    },
    [/Locale dictionaries must be imported through src\/locales\/index.ts/],
  );
});

void describe("A locale dictionary MUST contain only direct static string entries, with no nested locale objects, dynamic expressions, or unrelated declarations.", () => {
  verify(
    {
      "locales/compositions.ts": "export const compositions = { confirmDelete: getText() };",
    },
    [/Locale dictionary compositions has an invalid/, /Locale locales.compositions.confirmDelete is not defined/],
  );
  verify(
    {
      "locales/shared.ts": 'export const shared = { cancel: "Cancel" }, unrelated = "Unsafe";',
    },
    [
      /Locale module .* must contain only an exported const shared string dictionary/,
      /Locale locales.shared.cancel is not defined/,
    ],
  );
  verify(
    {
      "locales/index.ts": INDEX.replace(
        "export const locales = { shared, compositions, stream } as const;",
        "export const locales = { shared, compositions, stream } as const, unrelated = 1;",
      ),
    },
    [
      /Locale index must export a single const locales dictionary/,
      /Locale locales.compositions.confirmDelete is not defined/,
      /Locale locales.stream.watchLiveStream is not defined/,
      /Locale locales.shared.cancel is not defined/,
    ],
  );
});

void describe("A locale key MUST be English camelCase. A direct translation longer than 30 characters MUST describe the message's purpose instead and end in a WAI-ARIA element role postfix such as `Button`, `Link`, or `Dialog`.", () => {
  verify(
    {
      "locales/shared.ts": 'export const shared = { "invalid-key": "Cancel", cancel: "Cancel" };',
    },
    [/Locale dictionary shared has an invalid/],
  );
});
