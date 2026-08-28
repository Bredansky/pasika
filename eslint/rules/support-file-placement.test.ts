import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { supportFilePlacementRule } from "./support-file-placement";

/**
 * One fixture tree covering every placement outcome. Node runs each test file in
 * its own process, so the `chdir` below is contained: the rule resolves its source
 * root from the working directory, exactly as it does in a repository.
 */
const FIXTURE: Record<string, string> = {
  // A route consumer forces the app-wide support folder.
  "app/products/page.tsx":
    'import { useSearch } from "@/hooks/use-search";\nimport { useStale } from "@/features/stale/hooks/use-stale";\nexport default function Page() { return <span />; }\n',
  "hooks/use-search.ts": "export function useSearch() {}\n",
  "features/stale/hooks/use-stale.ts": "export function useStale() {}\n",

  // One feature owns these, and the same feature's misplaced siblings live in another feature.
  "features/billing/invoice.tsx": [
    'import { maxRetries } from "./constants";',
    'import { crossValue } from "./constants/cross";',
    'import { DateRange } from "./types";',
    'import { CrossType } from "./types/cross";',
    'import { calcTotal } from "./utils/calc-total";',
    'import { crossUtil } from "./utils/cross";',
    'import { useRetry } from "./hooks/use-retry";',
    'import { useCross } from "./hooks/use-cross";',
    'import { misplacedConstant } from "@/features/orders/constants/misplaced";',
    'import { MisplacedType } from "@/features/orders/types/misplaced";',
    'import { misplacedUtil } from "@/features/orders/utils/misplaced";',
    'import { useMisplaced } from "@/features/orders/hooks/use-misplaced";',
    'import { sharedConfigUtil } from "@/config/home-feed/utils/shared";',
    'import type { PlayerMode } from "@/config/player/types";',
    'import { playerDefaults } from "@/config/player/constants";',
    "export function Invoice() { return <span />; }",
    "",
  ].join("\n"),
  "features/billing/constants/index.ts": "export const maxRetries = 3;\n",
  "features/billing/types/index.ts": "export type DateRange = { from: Date };\n",
  "features/billing/utils/calc-total.ts": "export function calcTotal() { return 0; }\n",
  "features/billing/hooks/use-retry.ts": 'import { maxRetries } from "../constants";\nexport function useRetry() {}\n',

  // Consumed from two features, so no feature can own them.
  "features/orders/order.tsx": [
    'import { crossValue } from "@/features/billing/constants/cross";',
    'import { CrossType } from "@/features/billing/types/cross";',
    'import { crossUtil } from "@/features/billing/utils/cross";',
    'import { useCross } from "@/features/billing/hooks/use-cross";',
    "export function Order() { return <span />; }",
    "",
  ].join("\n"),
  "features/billing/constants/cross.ts": "export const crossValue = 1;\n",
  "features/billing/types/cross.ts": "export type CrossType = string;\n",
  "features/billing/utils/cross.ts": "export function crossUtil() { return 0; }\n",
  "features/billing/hooks/use-cross.ts": "export function useCross() {}\n",

  // Sitting in the wrong feature.
  "features/orders/constants/misplaced.ts": "export const misplacedConstant = 1;\n",
  "features/orders/types/misplaced.ts": "export type MisplacedType = string;\n",
  "features/orders/utils/misplaced.ts": "export function misplacedUtil() { return 0; }\n",
  "features/orders/hooks/use-misplaced.ts": "export function useMisplaced() {}\n",

  // A nested component is the only consumer, so the support file belongs in its folder.
  "features/billing/InvoiceCard/InvoiceCard.tsx":
    'import { useCard } from "../hooks/use-card";\nexport function InvoiceCard() { return <span />; }\n',
  "features/billing/hooks/use-card.ts": "export function useCard() {}\n",

  // A configuration module and the files that only it uses.
  "config/home-feed/index.ts": [
    'import { homeFeedSchema } from "./schemas";',
    'import { buildUrl } from "./utils/build-url";',
    'import { sharedConfigUtil } from "./utils/shared";',
    'import { onlyConfigUtil } from "@/utils/only-config";',
    'import { OnlyConfigType } from "@/types/only-config";',
    'import type { HomeFeedConfig } from "./types";',
    "export const homeFeedConfig = { url: buildUrl() };",
    "",
  ].join("\n"),
  "config/home-feed/schemas/index.ts": "export const homeFeedSchema = {};\n",
  "config/home-feed/types/index.ts": "export type HomeFeedConfig = { url: string };\n",
  "config/home-feed/utils/build-url.ts": 'export function buildUrl() { return ""; }\n',
  "config/home-feed/utils/shared.ts": "export function sharedConfigUtil() { return 0; }\n",
  "utils/only-config.ts": "export function onlyConfigUtil() { return 0; }\n",

  // A configuration module whose type and constant are read from outside it. Both
  // may stay, because their meaning comes from the configuration.
  "config/player/index.ts":
    'import type { PlayerMode } from "./types";\nimport { playerDefaults } from "./constants";\nexport const playerConfig = { mode: "auto" as PlayerMode, ...playerDefaults };\n',
  "config/player/types/index.ts": 'export type PlayerMode = "auto" | "manual";\n',
  "config/player/constants/index.ts": "export const playerDefaults = { volume: 1 };\n",
  "types/only-config.ts": "export type OnlyConfigType = string;\n",

  // A constant in one configuration module consumed only by another: the other
  // module owns it, so it must move there even though it lives in config.
  "config/theme/index.ts":
    'import { themeLimit } from "@/config/home-feed/constants/theme-limit";\nexport const theme = { limit: themeLimit };\n',
  "config/home-feed/constants/theme-limit.ts": "export const themeLimit = 10;\n",
};

// realpath: on macOS the temp dir is a symlink, and the rule resolves its source
// root from the working directory, so the two spellings have to agree.
const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-support-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const REASONS = {
  app: "a file under src/app/ imports it, so it belongs to the app-wide support folder",
  config: "every file that imports it belongs to that configuration module",
  ccf: "that is the closest folder its consumers share",
  features: "its consumers span more than one feature, so no feature can own it",
  layers: "its consumers span more than one layer, so no layer can own it",
};

const move = (folder: string, reason: string, consumers: string[]): { message: string } => ({
  message: `Move this file to ${folder} — ${reason}. Imported by ${consumers.map((c) => `src/${c}`).join(", ")}.`,
});

const ok = (relativePath: string): { code: string; filename: string } => ({
  code: read(relativePath),
  filename: file(relativePath),
});

void describe("Extracted constants MUST live in a constants/ folder at the CCF of their consumers.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("features/billing/constants/index.ts")],
    invalid: [
      {
        ...ok("features/orders/constants/misplaced.ts"),
        errors: [move("src/features/billing/constants/", REASONS.ccf, ["features/billing/invoice.tsx"])],
      },
    ],
  });
});

void describe("When a constant's CCF is src/features/, it MUST move to src/constants/.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/constants/cross.ts"),
        errors: [
          move("src/constants/", REASONS.features, ["features/billing/invoice.tsx", "features/orders/order.tsx"]),
        ],
      },
    ],
  });
});

void describe("Extracted types and schemas MUST live in their matching types/ or schemas/ folder at the CCF of their consumers.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("features/billing/types/index.ts")],
    invalid: [
      {
        ...ok("features/orders/types/misplaced.ts"),
        errors: [move("src/features/billing/types/", REASONS.ccf, ["features/billing/invoice.tsx"])],
      },
    ],
  });
});

void describe("When a type or schema's CCF is src/features/, it MUST move to src/types/ or src/schemas/.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/types/cross.ts"),
        errors: [move("src/types/", REASONS.features, ["features/billing/invoice.tsx", "features/orders/order.tsx"])],
      },
    ],
  });
});

void describe("An extracted utility MUST live in the utils/ folder at the CCF of its consumers.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("features/billing/utils/calc-total.ts")],
    invalid: [
      {
        ...ok("features/orders/utils/misplaced.ts"),
        errors: [move("src/features/billing/utils/", REASONS.ccf, ["features/billing/invoice.tsx"])],
      },
    ],
  });
});

void describe("When a utility's CCF is src/features/, it MUST move to src/utils/.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/utils/cross.ts"),
        errors: [move("src/utils/", REASONS.features, ["features/billing/invoice.tsx", "features/orders/order.tsx"])],
      },
    ],
  });
});

void describe("An extracted custom hook MUST live in a hooks/ folder at the CCF of its consumers.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("features/billing/hooks/use-retry.ts"), ok("hooks/use-search.ts")],
    invalid: [
      {
        ...ok("features/orders/hooks/use-misplaced.ts"),
        errors: [move("src/features/billing/hooks/", REASONS.ccf, ["features/billing/invoice.tsx"])],
      },
      {
        ...ok("features/stale/hooks/use-stale.ts"),
        errors: [move("src/hooks/", REASONS.app, ["app/products/page.tsx"])],
      },
    ],
  });
});

void describe("When a custom hook's CCF is src/features/, it MUST move to src/hooks/.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/hooks/use-cross.ts"),
        errors: [move("src/hooks/", REASONS.features, ["features/billing/invoice.tsx", "features/orders/order.tsx"])],
      },
    ],
  });
});

void describe("A type or schema used only to implement one configuration module MUST live in that module's types/ or schemas/ folder.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("config/home-feed/types/index.ts"), ok("config/home-feed/schemas/index.ts")],
    invalid: [
      {
        ...ok("types/only-config.ts"),
        errors: [move("src/config/home-feed/types/", REASONS.config, ["config/home-feed/index.ts"])],
      },
    ],
  });
});

void describe("A utility used only to implement one configuration module MUST live in that module's utils/ folder.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("config/home-feed/utils/build-url.ts")],
    invalid: [
      {
        ...ok("utils/only-config.ts"),
        errors: [move("src/config/home-feed/utils/", REASONS.config, ["config/home-feed/index.ts"])],
      },
    ],
  });
});

void describe("An extracted configuration schema or utility MUST move to its matching root support folder when a consumer outside its configuration module imports it.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    // A type or constant whose meaning comes from the configuration may stay
    // with it however widely it is read.
    valid: [ok("config/player/types/index.ts"), ok("config/player/constants/index.ts")],
    invalid: [
      {
        ...ok("config/home-feed/utils/shared.ts"),
        errors: [move("src/utils/", REASONS.layers, ["config/home-feed/index.ts", "features/billing/invoice.tsx"])],
      },
    ],
  });
});

void describe("A constant in one configuration module that only another configuration module consumes MUST move to the consuming module's constants/ folder.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("config/home-feed/constants/theme-limit.ts"),
        errors: [move("src/config/theme/constants/", REASONS.config, ["config/theme/index.ts"])],
      },
    ],
  });
});

void describe("A constant MAY live in src/config/<module>/ instead of a constants/ folder when a developer determines that it configures application behavior and is best understood alongside the configuration that parameterizes it, even when consumers exist outside the config module.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    // Consumers outside the config module do not place a config-owned constant;
    // only a consuming config module does, and that case has its own test above.
    valid: [ok("config/player/constants/index.ts")],
    invalid: [],
  });
});

void describe("A type MAY stay in src/config/<module>/ when its meaning is derived from the configuration that it parameterizes, even when consumers exist outside the config module.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("config/player/types/index.ts")],
    invalid: [],
  });
});

void describe("A nested component's support files MUST live in its folder.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/hooks/use-card.ts"),
        errors: [
          move("src/features/billing/InvoiceCard/hooks/", REASONS.ccf, [
            "features/billing/InvoiceCard/InvoiceCard.tsx",
          ]),
        ],
      },
    ],
  });
});
