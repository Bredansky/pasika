import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { componentPlacementRule } from "./component-placement";

/**
 * The rule reads the whole tree from disk, so the fixture is a real project. Node
 * runs each test file in its own process, which makes the `chdir` below safe: the
 * rule resolves its source root from the working directory, exactly as it does in
 * a repository.
 */
const FIXTURE: Record<string, string> = {
  // A component used by a route and by its own feature: correctly placed.
  "app/products/page.tsx":
    'import { ProductPrice } from "@/features/products/product-price";\nexport default function Page() { return <ProductPrice />; }\n',
  "features/products/product-card.tsx":
    'import { ProductPrice } from "./product-price";\nimport { ProductBadge } from "@/shared/product-badge";\nexport function ProductCard() { return <ProductPrice />; }\n',
  "features/products/product-price.tsx": "export function ProductPrice() { return <span />; }\n",

  // A component only a route uses: belongs to a feature.
  "app/search/page.tsx":
    'import { SearchForm } from "@/features/search/search-form";\nimport { OrphanForm } from "@/shared/orphan-form";\nexport default function Page() { return <SearchForm />; }\n',
  "features/search/search-form.tsx": "export function SearchForm() { return <form />; }\n",
  "shared/orphan-form.tsx": "export function OrphanForm() { return <form />; }\n",

  // Misplaced in shared: its only counting consumer is one feature.
  "shared/product-badge.tsx": "export function ProductBadge() { return <span />; }\n",

  // A component with exclusive children is nested in a folder named after it,
  // one level inside the CCF its consumers imply: stay-flat requires the
  // nesting, so placement must accept it. The consumer is in the same feature,
  // so the CCF is the feature folder and the nested folder adds the component
  // name.
  "features/catalog/CatalogPanel/index.ts": 'export { CatalogPanel } from "./CatalogPanel";\n',
  "features/catalog/CatalogPanel/CatalogPanel.tsx":
    'import { CatalogItem } from "../catalog-item";\nimport { CatalogPanelHeader } from "./catalog-panel-header";\nimport { CatalogPanelFooter } from "./catalog-panel-footer";\nexport function CatalogPanel() { return <CatalogItem />; }\n',
  "features/catalog/CatalogPanel/catalog-panel-header.tsx":
    "export function CatalogPanelHeader() { return <header />; }\n",
  "features/catalog/CatalogPanel/catalog-panel-footer.tsx":
    "export function CatalogPanelFooter() { return <footer />; }\n",
  "features/catalog/catalog-item.tsx": "export function CatalogItem() { return <span />; }\n",
  "features/catalog/catalog-page.tsx":
    'import { CatalogPanel } from "./CatalogPanel";\nimport { CatalogPanelFooter } from "./CatalogPanel/catalog-panel-footer";\nexport function CatalogPage() { return <CatalogPanelFooter />; }\n',

  // Compositions consumers count only when every consumer is one.
  "compositions/checkout.tsx":
    'import { Total } from "@/features/payments/total";\nimport { Subtotal } from "./subtotal";\nimport { StatusBadge } from "@/shared/status-badge";\nexport function Checkout() { return <Total />; }\n',
  "compositions/receipt.tsx":
    'import { Subtotal } from "./subtotal";\nexport function Receipt() { return <Subtotal />; }\n',
  "compositions/subtotal.tsx": "export function Subtotal() { return <span />; }\n",
  "features/payments/payment-summary.tsx":
    'import { Total } from "./total";\nimport { StatusBadge } from "@/shared/status-badge";\nimport { Badge } from "./badge";\nexport function PaymentSummary() { return <Total />; }\n',
  "features/payments/total.tsx": "export function Total() { return <span />; }\n",

  // Shared across two features, so it belongs to the shared layer.
  "features/orders/order-card.tsx":
    'import { StatusBadge } from "@/shared/status-badge";\nimport { Badge } from "@/features/payments/badge";\nexport function OrderCard() { return <StatusBadge />; }\n',
  "shared/status-badge.tsx": "export function StatusBadge() { return <span />; }\n",
  "features/payments/badge.tsx": "export function Badge() { return <span />; }\n",

  // A feature-local component imports one foreign feature; it must be a composition
  // so component placement agrees with the layer-boundary rule.
  "features/editor/editor-selector.tsx":
    'import { CredentialBadge } from "@/features/credentials/credential-badge";\nexport function EditorSelector() { return <CredentialBadge />; }\n',
  "features/credentials/credential-badge.tsx": "export function CredentialBadge() { return <span />; }\n",
  "app/editor/page.tsx":
    'import { EditorSelector } from "@/compositions/editor-selector";\nexport default function Page() { return <EditorSelector />; }\n',
  "compositions/editor-selector.tsx":
    'import { CredentialBadge } from "@/features/credentials/credential-badge"; import { ProductPrice } from "@/features/products/product-price";\nexport function EditorSelector() { return <CredentialBadge />; }\n',

  // A route-exposed one-feature composition, imported through a component barrel.
  "app/solo/page.tsx":
    'import { Solo } from "@/compositions/solo";\nexport default function Page() { return <Solo />; }\n',
  "compositions/solo/index.ts": 'export { Solo } from "./solo";\n',
  "compositions/solo/solo.tsx":
    'import { HomeHero } from "@/features/home/home-hero";\nexport function Solo() { return <HomeHero />; }\n',
  "features/home/home-hero.tsx": "export function HomeHero() { return <div />; }\n",

  // An eligible composition reaches its second feature through a composition child.
  "app/landing/page.tsx":
    'import { Landing } from "@/compositions/landing";\nexport default function Page() { return <Landing />; }\n',
  "compositions/landing/index.ts": 'export { Landing } from "./landing";\n',
  "compositions/landing/landing.tsx":
    'import { HomeHero } from "@/features/home/home-hero"; import { LandingContent } from "./landing-content";\nexport function Landing() { return <LandingContent />; }\n',
  "compositions/landing/landing-content.tsx":
    'import { LiveBanner } from "@/features/stream/live-banner";\nexport function LandingContent() { return <LiveBanner />; }\n',
  "compositions/landing/landing-content.test.tsx":
    'import { LandingContent } from "./landing-content";\nexport const tested = LandingContent;\n',
  "compositions/shell/shell.tsx":
    'import { Landing } from "@/compositions/landing";\nexport function Shell() { return <Landing />; }\n',
  // Test-only imports are not placement consumers.
  "features/home/home-hero.test.tsx":
    'import { TestDriven } from "@/shared/test-driven";\nexport const subject = TestDriven;\n',
  "shared/test-driven.tsx": "export function TestDriven() { return <span />; }\n",
  "features/stream/live-banner.tsx": "export function LiveBanner() { return <div />; }\n",

  // A single feature reached via a nested composition still does not qualify.
  "app/wrapper/page.tsx":
    'import { Wrapper } from "@/compositions/wrapper";\nexport default function Page() { return <Wrapper />; }\n',
  "compositions/wrapper/index.ts": 'export { Wrapper } from "./wrapper";\n',
  "compositions/wrapper/wrapper.tsx":
    'import { StreamOnly } from "@/compositions/stream-only";\nexport function Wrapper() { return <StreamOnly />; }\n',
  "compositions/stream-only/index.ts": 'export { StreamOnly } from "./stream-only";\n',
  "compositions/stream-only/stream-only.tsx":
    'import { LiveBanner } from "@/features/stream/live-banner";\nexport function StreamOnly() { return <LiveBanner />; }\n',
};

// realpath: on macOS the temp dir is a symlink, and the rule resolves its source
// root from the working directory, so the two spellings have to agree.
const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-placement-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const DOC = "See docs/next-codebase-guide/rules/component-placement-rule.md";

const moveMessage = (folder: string, explanation: string, consumers: string[]): string =>
  `Move this component to ${folder} — ${explanation}. Imported by ${consumers.join(", ")}. ${DOC}`;

const featureMessage = (currentFolder: string): string =>
  `This component has no consumer outside src/app/ or a configuration module, ` +
  `so it belongs in the feature folder it represents, not in ${currentFolder}. ${DOC}`;

void describe("A component used only by src/app/ or configuration modules that does not integrate two or more distinct feature folders MUST live in the feature folder it represents or supports, creating one if necessary.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [{ code: read("features/search/search-form.tsx"), filename: file("features/search/search-form.tsx") }],
    invalid: [
      {
        code: read("shared/orphan-form.tsx"),
        filename: file("shared/orphan-form.tsx"),
        errors: [{ message: featureMessage("src/shared/") }],
      },
    ],
  });
});

void describe("A component with consumers outside src/app/ and configuration modules MUST live in its CCF, excluding those modules from the calculation.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [
      {
        code: read("features/products/product-price.tsx"),
        filename: file("features/products/product-price.tsx"),
      },
    ],
    invalid: [
      {
        code: read("shared/product-badge.tsx"),
        filename: file("shared/product-badge.tsx"),
        errors: [
          {
            message: moveMessage("src/features/products/", "that is the closest folder its consumers share", [
              "src/features/products/product-card.tsx",
            ]),
          },
        ],
      },
    ],
  });
});

void describe("A component with exclusive children may be nested in a folder named after it one level inside its CCF.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [
      // The nested folder is the CCF plus the component name: stay-flat nesting.
      {
        code: read("features/catalog/CatalogPanel/CatalogPanel.tsx"),
        filename: file("features/catalog/CatalogPanel/CatalogPanel.tsx"),
      },
    ],
    invalid: [],
  });
});

void describe("A nested component folder's `index.ts` MUST export only the nested component, and any file needed outside that folder MUST move to the CCF of its consumers.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [
      {
        code: read("features/catalog/CatalogPanel/catalog-panel-header.tsx"),
        filename: file("features/catalog/CatalogPanel/catalog-panel-header.tsx"),
      },
    ],
    invalid: [
      {
        code: read("features/catalog/CatalogPanel/catalog-panel-footer.tsx"),
        filename: file("features/catalog/CatalogPanel/catalog-panel-footer.tsx"),
        errors: 1,
      },
    ],
  });
});

void describe("When calculating a component's CCF, consumers under src/compositions/ MUST count only when no consumer is outside src/compositions/.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [
      // One composition consumer and one feature consumer: the composition drops out.
      { code: read("features/payments/total.tsx"), filename: file("features/payments/total.tsx") },
      // Every consumer is a composition, so compositions count.
      { code: read("compositions/subtotal.tsx"), filename: file("compositions/subtotal.tsx") },
    ],
    invalid: [],
  });
});

void describe("A component whose CCF is src/features/ MUST live in src/shared/.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [{ code: read("shared/status-badge.tsx"), filename: file("shared/status-badge.tsx") }],
    invalid: [
      {
        code: read("features/payments/badge.tsx"),
        filename: file("features/payments/badge.tsx"),
        errors: [
          {
            message: moveMessage(
              "src/shared/",
              "its consumers span more than one feature, and no feature may import from another",
              ["src/features/orders/order-card.tsx", "src/features/payments/payment-summary.tsx"],
            ),
          },
        ],
      },
    ],
  });
});

void describe("A feature component cannot import another feature directly.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [{ code: read("compositions/editor-selector.tsx"), filename: file("compositions/editor-selector.tsx") }],
    invalid: [
      {
        code: read("features/editor/editor-selector.tsx"),
        filename: file("features/editor/editor-selector.tsx"),
        errors: [
          {
            message: `A feature component cannot import another feature. Remove the cross-feature dependency or create a composition that integrates at least two features. ${DOC}`,
          },
        ],
      },
    ],
  });
});

void describe("As an exception, a composition entrypoint that is also imported by `src/app/` or a configuration module MUST remain in `src/compositions/` if it integrates two or more distinct features.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [{ code: read("compositions/landing/landing.tsx"), filename: file("compositions/landing/landing.tsx") }],
    invalid: [],
  });
});

void describe("A composition entrypoint used by `src/app/` or a configuration module MUST integrate two or more distinct feature folders, directly or through composition children.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [
      { code: read("compositions/landing/landing.tsx"), filename: file("compositions/landing/landing.tsx") },
      {
        code: read("compositions/landing/landing-content.tsx"),
        filename: file("compositions/landing/landing-content.tsx"),
      },
    ],
    invalid: [
      {
        code: read("compositions/solo/solo.tsx"),
        filename: file("compositions/solo/solo.tsx"),
        errors: [
          {
            message:
              `A composition must combine at least two distinct feature folders, directly or through composition children; found home. ` +
              `Move it into the feature it represents or integrate multiple features. ${DOC}`,
          },
        ],
      },
      {
        code: read("compositions/wrapper/wrapper.tsx"),
        filename: file("compositions/wrapper/wrapper.tsx"),
        errors: [
          {
            message:
              `A composition must combine at least two distinct feature folders, directly or through composition children; found stream. ` +
              `Move it into the feature it represents or integrate multiple features. ${DOC}`,
          },
        ],
      },
    ],
  });
});

void describe("When calculating a component's CCF, barrel files MUST be skipped in favor of the files that import through them, and tests MUST NOT count as consumers.", () => {
  ruleTester.run("component-placement", componentPlacementRule, {
    valid: [{ code: read("features/search/search-form.tsx"), filename: file("features/search/search-form.tsx") }],
    invalid: [
      {
        code: read("shared/test-driven.tsx"),
        filename: file("shared/test-driven.tsx"),
        errors: [{ message: featureMessage("src/shared/") }],
      },
      {
        code: read("compositions/solo/solo.tsx"),
        filename: file("compositions/solo/solo.tsx"),
        errors: [
          {
            message:
              `A composition must combine at least two distinct feature folders, directly or through composition children; found home. ` +
              `Move it into the feature it represents or integrate multiple features. ${DOC}`,
          },
        ],
      },
    ],
  });
});
