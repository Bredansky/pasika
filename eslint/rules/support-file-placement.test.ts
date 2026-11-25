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
  "features/credentials/constants/single-api-contract.ts":
    'import { defineApiContract } from "pasika/api-contract"; export const externalApiContract = defineApiContract({});',
  "features/credentials/utils/external-api.ts":
    'import { externalApiContract } from "../constants/single-api-contract"; export function callApi() { return externalApiContract; }',
  // Shineposter regression: a hook-local counter was extracted into a shared constants barrel.
  "features/credentials/constants/index.ts":
    "export const credentialCryptoIvLength = 16;\nexport const initialCredentialsRequestId = 0;\n",
  "features/credentials/hooks/use-credentials.ts":
    'import { initialCredentialsRequestId } from "../constants"; export function useCredentials() { return initialCredentialsRequestId; }',
  "features/credentials/utils/encrypt.ts":
    'import { credentialCryptoIvLength } from "../constants"; export function encrypt() { return credentialCryptoIvLength; }',
  "features/credentials/utils/decrypt.ts":
    'import { credentialCryptoIvLength } from "../constants"; export function decrypt() { return credentialCryptoIvLength; }',
  "features/credentials/hooks/use-credentials.test.ts":
    'import { initialCredentialsRequestId } from "../constants"; export const observed = initialCredentialsRequestId;',
  "features/credentials/constants/request.ts": "export const initialRequest = 0;",
  "features/credentials/constants/barrel.ts": 'export * from "./request";',
  "features/credentials/utils/request.ts":
    'import { initialRequest } from "../constants/barrel"; export function request() { return initialRequest; }',
  "features/credentials/constants/local-dependency.ts":
    "export const initialValue = 0; export const initialState = { value: initialValue };",
  "features/credentials/utils/state.ts":
    'import { initialValue, initialState } from "../constants/local-dependency"; export function state() { return { initialValue, initialState }; }',
  "features/credentials/constants/type-only.ts": "export const typeOnlyValue = { value: 0 };",
  "features/credentials/types/derived.ts":
    'import type { typeOnlyValue } from "../constants/type-only"; export type Derived = typeof typeOnlyValue;',
  "features/credentials/constants/test-only.ts": "export const testOnlyValue = 0;",
  "features/credentials/utils/test-only.test.ts":
    'import { testOnlyValue } from "../constants/test-only"; export const observed = testOnlyValue;',

  // A root constants barrel re-exports a feature-local constant. The consumer
  // imports through the barrel, so the placement graph must follow the export.
  "constants/index.ts": 'export * from "./feature-only";\n',
  "constants/feature-only.ts": "export const featureOnlyConstant = 1;\n",
  "features/billing/root-consumer.tsx":
    'import { featureOnlyConstant } from "@/constants";\nexport function RootConsumer() { return <span>{featureOnlyConstant}</span>; }\n',

  // A route or page is an entry point, not a reuse site, so it never places a
  // support file: only the feature consumer below counts for `use-stale`.
  "app/products/page.tsx":
    'import { useSearch } from "@/hooks/use-search";\nimport { useStale } from "@/features/stale/hooks/use-stale";\nexport default function Page() { return <span />; }\n',
  "hooks/use-search.ts": "export function useSearch() {}\n",
  "features/stale/hooks/use-stale.ts": "export function useStale() {}\n",

  // One feature owns these, and the same feature's misplaced siblings live in another feature.
  "features/billing/invoice.tsx": [
    'import { maxRetries } from "./constants";',
    'import { InvoiceStatus } from "./constants/invoice-status";',
    'import { MisplacedStatus } from "@/features/orders/constants/misplaced-status";',
    'import { crossValue } from "./constants/cross";',
    'import { billingConstant, sharedConstant } from "./constants/mixed";',
    'import { DateRange } from "./types";',
    'import { CrossType } from "./types/cross";',
    'import type { BillingOnlyType, SharedType } from "./types/mixed";',
    'import { calcTotal } from "./utils/calc-total";',
    'import { crossUtil } from "./utils/cross";',
    'import { billingOnly, sharedUtility } from "./utils/mixed";',
    'import { useRetry } from "./hooks/use-retry";',
    'import { useCross } from "./hooks/use-cross";',
    'import { useStale } from "@/features/stale/hooks/use-stale";',
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
  // A lone component-owned enum should not be extracted into constants/index.ts.
  "features/home/constants/index.ts": 'export enum RetroCardSurface { Card = "card", Gradient = "gradient" }\n',
  "features/home/retro-card.tsx":
    'import { RetroCardSurface } from "./constants";\nexport function RetroCard() { return <div>{RetroCardSurface.Card}</div>; }\n',
  "features/home/support-section.tsx":
    'import { RetroCardSurface } from "./constants"; import { RetroCard } from "./retro-card"; export function SupportSection() { return <RetroCard />; }',
  "features/home/retro-card-surface.test.ts":
    'import { RetroCardSurface } from "./constants"; export const values = Object.values(RetroCardSurface);',
  "features/archive/constants/index.ts": 'export enum ArchiveSurface { Card = "card", Gradient = "gradient" }',
  "features/archive/card.tsx":
    'import { ArchiveSurface } from "./constants"; export function ArchiveCard() { return <div>{ArchiveSurface.Card}</div>; }',
  "features/archive/banner.tsx":
    'import { ArchiveSurface } from "./constants"; export function ArchiveBanner() { return <div>{ArchiveSurface.Gradient}</div>; }',

  // Shared between independent components: keep the enum extracted.
  "features/home/constants/shared-surface.ts": 'export enum SharedSurface { Card = "card", Gradient = "gradient" }\n',
  "features/home/first-shared-card.tsx":
    'import { SharedSurface } from "./constants/shared-surface";\nexport function FirstSharedCard() { return <div>{SharedSurface.Card}</div>; }\n',
  "features/home/second-shared-card.tsx":
    'import { SharedSurface } from "./constants/shared-surface";\nexport function SecondSharedCard() { return <div>{SharedSurface.Gradient}</div>; }\n',

  "features/billing/constants/invoice-status.ts": 'export enum InvoiceStatus { Draft = "draft", Ready = "ready" }\n',
  "features/billing/types/index.ts": "export type DateRange = { from: Date };\n",
  "features/billing/utils/calc-total.ts": "export function calcTotal() { return 0; }\n",
  "features/billing/hooks/use-retry.ts":
    'import { maxRetries } from "../constants";\nimport { InvoiceStatus } from "../constants/invoice-status";\nimport { billingConstant } from "../constants/mixed";\nimport { misplacedConstant } from "@/features/orders/constants/misplaced";\nimport { MisplacedStatus } from "@/features/orders/constants/misplaced-status";\nexport function useRetry() {}\n',

  // Consumed from two features, so no feature can own them.
  "features/orders/order.tsx": [
    'import { crossValue } from "@/features/billing/constants/cross";',
    'import { sharedConstant } from "@/features/billing/constants/mixed";',
    'import { CrossType } from "@/features/billing/types/cross";',
    'import type { SharedType } from "@/features/billing/types/mixed";',
    'import { crossUtil } from "@/features/billing/utils/cross";',
    'import { sharedUtility } from "@/features/billing/utils/mixed";',
    'import { useCross } from "@/features/billing/hooks/use-cross";',
    "export function Order() { return <span />; }",
    "",
  ].join("\n"),
  "features/billing/constants/cross.ts": "export const crossValue = 1;\n",
  "features/billing/constants/mixed.ts": "export const billingConstant = 1;\nexport const sharedConstant = 1;\n",
  "features/billing/types/cross.ts": "export type CrossType = string;\n",
  "features/billing/types/mixed.ts": "export type BillingOnlyType = string;\nexport type SharedType = string;\n",
  "features/billing/utils/cross.ts": "export function crossUtil() { return 0; }\n",
  "features/billing/utils/mixed.ts":
    "export function billingOnly() { return 0; }\nexport function sharedUtility() { return 0; }\n",
  "features/billing/hooks/use-cross.ts": "export function useCross() {}\n",

  // Sitting in the wrong feature.
  "features/orders/constants/misplaced.ts": "export const misplacedConstant = 1;\n",
  "features/orders/constants/misplaced-status.ts": 'export enum MisplacedStatus { Draft = "draft", Ready = "ready" }\n',
  "features/orders/types/misplaced.ts": "export type MisplacedType = string;\n",
  "features/orders/utils/misplaced.ts": "export function misplacedUtil() { return 0; }\n",
  "features/orders/hooks/use-misplaced.ts": "export function useMisplaced() {}\n",

  // A nested component is the only consumer, so the support file belongs in its folder.
  "features/billing/InvoiceCard/InvoiceCard.tsx":
    'import { useCard } from "../hooks/use-card";\nexport function InvoiceCard() { return <span />; }\n',
  "features/billing/InvoiceCard/index.ts": 'export { InvoiceCard } from "./InvoiceCard";\n',
  "features/billing/hooks/use-card.ts": "export function useCard() {}\n",

  // A case-mismatched owner must not turn the folder into a component scope.
  "features/billing/poster/Poster.tsx":
    'import { usePoster } from "../hooks/use-poster";\nexport function Poster() { usePoster(); return <span />; }\n',
  "features/billing/poster/index.ts": 'export { Poster } from "./Poster";\n',
  "features/billing/hooks/use-poster.ts": "export function usePoster() {}\n",

  // `components/` is not a component-folder scope; its component owns the
  // feature folder for support-file CCF calculation.
  "features/billing/components/credential-form.tsx":
    'import type { CredentialType } from "./types/credential-type";\nexport function CredentialForm() { return <span />; }\n',
  "features/billing/components/types/credential-type.ts": "export type CredentialType = string;\n",

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

  // Merch-style files export many local declarations via a named export list.
  // Only the values always used with MerchProductCard are component-owned.
  "features/merch/constants/index.ts": [
    "enum StarOrdinal { First = 1, Second = 2 }",
    "const starOrdinals = [StarOrdinal.First, StarOrdinal.Second];",
    'const cardImageSizes = "(max-width: 640px) 100vw";',
    'const sharedFilter = "all";',
    "const products = [{ id: 1 }];",
    'const pageOnlyBanner = "promo";',
    "export { starOrdinals, cardImageSizes, sharedFilter, products, pageOnlyBanner };",
    "",
  ].join("\n"),
  "features/merch/merch-product-card.tsx":
    'import { starOrdinals, cardImageSizes, sharedFilter } from "./constants"; import type { products } from "./constants"; export function MerchProductCard() { return <div>{starOrdinals.length}{cardImageSizes}{sharedFilter}</div>; }',
  "features/merch/merch-catalog.tsx":
    'import { sharedFilter } from "./constants"; export function MerchCatalog() { return <p>{sharedFilter}</p>; }',
  "app/merch/page.tsx":
    'import { cardImageSizes, products, pageOnlyBanner } from "@/features/merch/constants"; import { MerchProductCard } from "@/features/merch/merch-product-card"; export default function MerchPage() { return <MerchProductCard />; }',
  "features/merch/card.test.ts":
    'import { starOrdinals } from "./constants"; export const count = starOrdinals.length;',

  // Independent runtime users and type-only component imports must not make
  // exported data appear to belong to a particular component.
  "features/shared/constants/index.ts":
    'const sharedValue = "shared"; const typeOnlyData = [{ id: 1 }]; export { sharedValue, typeOnlyData };',
  "features/shared/card.tsx":
    'import { sharedValue } from "./constants"; import type { typeOnlyData } from "./constants"; export function Card() { return <span>{sharedValue}</span>; }',
  "features/shared/list.tsx":
    'import { sharedValue } from "./constants"; export function List() { return <span>{sharedValue}</span>; }',
  "app/shared/page.tsx":
    'import { typeOnlyData } from "@/features/shared/constants"; import { Card } from "@/features/shared/card"; export default function Page() { return <Card />; }',

  // An exported enum also used to construct another exported value remains
  // owned by its current module, even if its external importers share a deeper CCF.
  "features/merch-owned/constants/index.ts": [
    'enum FilterType { All = "all", Clothing = "clothing" }',
    "const filterCategories = Object.values(FilterType);",
    "const products = [{ category: FilterType.Clothing }];",
    "export { FilterType, filterCategories, products };",
    "",
  ].join("\n"),
  "features/merch-owned/merch-catalog/index.ts": 'export { MerchCatalog } from "./merch-catalog";',
  "features/merch-owned/merch-catalog/merch-catalog.tsx":
    'import { FilterType } from "../constants"; export function MerchCatalog() { return <div>{FilterType.All}</div>; }',
  "features/merch-owned/merch-catalog/merch-filter-button.tsx":
    'import type { FilterType } from "../constants"; export function MerchFilterButton(props: { type: FilterType }) { return <button>{props.type}</button>; }',
  "app/merch-owned/page.tsx":
    'import { products, filterCategories } from "@/features/merch-owned/constants"; export default function Page() { return <p>{products.length}{filterCategories.length}</p>; }',

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

void describe("Shared constants and enums MUST live in `constants/` at their direct consumers' CCF, using `src/constants/` when the CCF is `src/features/`.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("features/billing/constants/index.ts"), ok("features/billing/constants/invoice-status.ts")],
    invalid: [
      {
        ...ok("features/orders/constants/misplaced.ts"),
        errors: [
          move("src/features/billing/constants/", REASONS.ccf, [
            "features/billing/hooks/use-retry.ts",
            "features/billing/invoice.tsx",
          ]),
        ],
      },
      {
        ...ok("features/orders/constants/misplaced-status.ts"),
        errors: [
          move("src/features/billing/constants/", REASONS.ccf, [
            "features/billing/hooks/use-retry.ts",
            "features/billing/invoice.tsx",
          ]),
        ],
      },
      {
        ...ok("constants/feature-only.ts"),
        errors: [
          {
            message:
              "featureOnlyConstant has only one production consumer (src/features/billing/root-consumer.tsx); declare it in that file instead of extracting a constants/ folder. See docs/next-codebase-guide/rules/constants-rule.md",
          },
        ],
      },
    ],
  });
});

void describe("Shared constants and enums MUST live in `constants/` at their direct consumers' CCF, using `src/constants/` when the CCF is `src/features/`.", () => {
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

void describe("A constant or enum MUST remain in its declaring file while it is only used locally or imported together with its owning component; only independent consumers require extraction.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("features/home/constants/shared-surface.ts"), ok("features/archive/constants/index.ts")],
    invalid: [
      {
        ...ok("features/home/constants/index.ts"),
        errors: [
          {
            message:
              "RetroCardSurface is consumed only alongside RetroCard (src/features/home/retro-card.tsx); " +
              "declare it beside its owning component instead of extracting a constants/ folder. " +
              "See docs/next-codebase-guide/rules/constants-rule.md",
          },
        ],
      },
    ],
  });
});

void describe("A constant with only one runtime consumer must be declared in that consumer.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [
      ok("features/credentials/constants/type-only.ts"),
      ok("features/credentials/constants/test-only.ts"),
      ok("features/credentials/constants/single-api-contract.ts"),
    ],
    invalid: [
      {
        ...ok("features/credentials/constants/index.ts"),
        errors: [
          {
            message:
              "initialCredentialsRequestId has only one production consumer (src/features/credentials/hooks/use-credentials.ts); declare it in that file instead of extracting a constants/ folder. See docs/next-codebase-guide/rules/constants-rule.md",
          },
        ],
      },
      {
        ...ok("features/credentials/constants/request.ts"),
        errors: [
          {
            message:
              "initialRequest has only one production consumer (src/features/credentials/utils/request.ts); declare it in that file instead of extracting a constants/ folder. See docs/next-codebase-guide/rules/constants-rule.md",
          },
        ],
      },
      {
        ...ok("features/credentials/constants/local-dependency.ts"),
        errors: [
          {
            message:
              "initialState has only one production consumer (src/features/credentials/utils/state.ts); declare it in that file instead of extracting a constants/ folder. See docs/next-codebase-guide/rules/constants-rule.md",
          },
        ],
      },
    ],
  });
});

void describe("Each exported value in a multi-export constants/index.ts MUST be colocated with the component that owns its runtime use.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("features/shared/constants/index.ts"), ok("features/merch-owned/constants/index.ts")],
    invalid: [
      {
        ...ok("features/merch/constants/index.ts"),
        errors: ["starOrdinals", "cardImageSizes"].map((name) => ({
          message:
            `${name} is consumed only alongside MerchProductCard (src/features/merch/merch-product-card.tsx); ` +
            `declare it beside its owning component instead of extracting a constants/ folder. ` +
            `See docs/next-codebase-guide/rules/constants-rule.md`,
        })),
      },
    ],
  });
});

void describe("A `constants/` file MUST split exported constants whose direct consumers have different CCFs.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/constants/mixed.ts"),
        errors: [
          {
            message:
              "Split constants exports with different CCFs: billingConstant → src/features/billing/constants/, sharedConstant → src/constants/.",
          },
        ],
      },
    ],
  });
});

void describe("A file in `types/` or `schemas/` MUST calculate each exported type or schema's CCF from that item's direct consumers and MUST split exports whose CCFs differ.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/types/mixed.ts"),
        errors: [
          {
            message:
              "Split types exports with different CCFs: BillingOnlyType → src/features/billing/types/, SharedType → src/types/.",
          },
        ],
      },
    ],
  });
});

void describe("An exported utility's CCF MUST be calculated from that export's direct consumers, not from every export in the file that declares it.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/utils/mixed.ts"),
        errors: [
          {
            message:
              "Split utils exports with different CCFs: billingOnly → src/features/billing/utils/, sharedUtility → src/utils/.",
          },
        ],
      },
    ],
  });
});

void describe("Exports with different CCFs MUST be split into separately placed utility files.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/utils/mixed.ts"),
        errors: [
          {
            message:
              "Split utils exports with different CCFs: billingOnly → src/features/billing/utils/, sharedUtility → src/utils/.",
          },
        ],
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
        errors: [move("src/features/billing/hooks/", REASONS.ccf, ["features/billing/invoice.tsx"])],
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

void describe("A type or schema used only to implement one configuration file MUST live in that file's types/ or schemas/ folder.", () => {
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

void describe("A utility used only to implement one configuration file MUST live in that file's utils/ folder.", () => {
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
    // A type or constant whose meaning comes from the configuration may stay    // with it however widely it is read.
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

void describe("A constant MAY stay in `src/config/<config-name>/` when it configures that module's behavior, even if other files consume it.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    // Consumers outside the config module do not place a config-owned constant;
    // only a consuming config module does, and that case has its own test above.
    valid: [ok("config/player/constants/index.ts")],
    invalid: [],
  });
});

void describe("A type MAY stay in src/config/<config-name>/ when its meaning is derived from the configuration that it parameterizes, even when consumers exist outside the configuration file.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("config/player/types/index.ts")],
    invalid: [],
  });
});

void describe("A nested component's support files MUST live in its folder.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [ok("features/billing/hooks/use-poster.ts")],
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

void describe("A support export consumed by a component in `components/` MUST use the feature folder, because `components/` is not a valid component-folder scope.", () => {
  ruleTester.run("support-file-placement", supportFilePlacementRule, {
    valid: [],
    invalid: [
      {
        ...ok("features/billing/components/types/credential-type.ts"),
        errors: [move("src/features/billing/types/", REASONS.ccf, ["features/billing/components/credential-form.tsx"])],
      },
    ],
  });
});
