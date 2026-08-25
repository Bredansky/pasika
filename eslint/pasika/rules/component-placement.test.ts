import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester.js";
import { componentPlacementRule } from "./component-placement.js";

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

const DOC = "See docs/code-organization-guide/rules/component-placement-rule.md";

const moveMessage = (folder: string, explanation: string, consumers: string[]): string =>
  `Move this component to ${folder} — ${explanation}. Imported by ${consumers.join(", ")}. ${DOC}`;

const featureMessage = (currentFolder: string): string =>
  `This component has no consumer outside src/app/ or a configuration module, ` +
  `so it belongs in the feature folder it represents, not in ${currentFolder}. ${DOC}`;

void describe("A component with no consumers outside src/app/ or configuration modules, and that does not import from two or more feature folders, MUST live in the feature folder it represents or supports. If no existing feature applies, it MUST introduce a new feature folder.", () => {
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

void describe("A component with at least one consumer outside src/app/ and configuration modules MUST live in its CCF, calculated without imports from src/app/ or configuration modules.", () => {
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
