import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { typeExtractionRule } from "./type-extraction";

/**
 * The rule reads the whole tree from disk, so the fixture is a real project.
 * Node runs each test file in its own process, which makes the `chdir` below
 * safe: the rule resolves its source root from the working directory.
 */
const FIXTURE: Record<string, string> = {
  // A type in a component file, imported without the component.
  "features/billing/invoice.tsx":
    "export type DateRange = { from: Date; to: Date };\nexport function Invoice() { return <div />; }\n",
  "features/billing/hooks/use-billing-filter.ts":
    'import type { DateRange } from "../invoice";\nexport function useBillingFilter(range: DateRange) { return range; }\n',

  // A schema in a component file, imported alongside the component: no extraction.
  "features/billing/invoice-form.tsx":
    'import { z } from "zod";\nexport const invoiceSchema = z.object({ amount: z.number() });\nexport function InvoiceForm() { return <div />; }\n',
  "features/billing/invoice-page.tsx":
    'import { InvoiceForm, invoiceSchema } from "./invoice-form";\nexport function InvoicePage() { return <InvoiceForm />; }\n',

  // A type in a plain file, imported without using the code in the file.
  "features/billing/date-range.ts":
    "export type DateRange = { from: Date; to: Date };\nexport const formatDate = (date: Date) => date.toISOString();\n",
  "features/billing/hooks/use-date-filter.ts":
    'import type { DateRange } from "../date-range";\nexport function useDateFilter(range: DateRange) { return range; }\n',

  // A type in a plain file, imported together with the code: no extraction.
  "features/billing/currency.ts":
    "export type Currency = \"usd\" | \"eur\";\nexport const formatCurrency = (amount: number) => amount.toFixed(2);\n",
  "features/billing/price-tag.tsx":
    'import { formatCurrency, type Currency } from "./currency";\nexport function PriceTag({ currency }: { currency: Currency }) { return <span>{formatCurrency(1)}</span>; }\n',

  // A file that exports only types: importing from it is the extraction destination.
  "features/billing/types/index.ts": "export type InvoiceStatus = \"draft\" | \"paid\";\n",
  "features/billing/invoice-status.tsx":
    'import type { InvoiceStatus } from "./types";\nexport function InvoiceStatus({ status }: { status: InvoiceStatus }) { return <span>{status}</span>; }\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-type-extraction-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const DOC = "See docs/next-codebase-guide/rules/types-and-schemas-rule.md";

void describe(
  "A type or schema declared in a component MUST stay in that component file until another file imports it without the component where it is defined.",
  () => {
    ruleTester.run("type-extraction", typeExtractionRule, {
      valid: [
        // The consumer imports the schema alongside the component: no extraction.
        {
          code: read("features/billing/invoice-form.tsx"),
          filename: file("features/billing/invoice-form.tsx"),
        },
      ],
      invalid: [
        {
          code: read("features/billing/invoice.tsx"),
          filename: file("features/billing/invoice.tsx"),
          errors: [
            {
              message:
              `type "DateRange" is imported by src/features/billing/hooks/use-billing-filter.ts without the component "Invoice" that defines it. Extract it to a types/ or schemas/ folder. ${DOC}`,
            },
          ],
        },
      ],
    });
  },
);

void describe(
  "Importing a type or schema alongside the component that defines it MUST NOT require extraction.",
  () => {
    ruleTester.run("type-extraction", typeExtractionRule, {
      valid: [
        // A consumer imports the schema alongside the component: no extraction.
        {
          code: read("features/billing/invoice-form.tsx"),
          filename: file("features/billing/invoice-form.tsx"),
        },
        {
          code: read("features/billing/invoice-page.tsx"),
          filename: file("features/billing/invoice-page.tsx"),
        },
      ],
      invalid: [],
    });
  },
);

void describe(
  "A type or schema declared outside a component MUST stay in its file until another file needs it without using the code in that file.",
  () => {
    ruleTester.run("type-extraction", typeExtractionRule, {
      valid: [
        // The consumer imports the type together with the code in the file.
        {
          code: read("features/billing/currency.ts"),
          filename: file("features/billing/currency.ts"),
        },
        // A file that exports only types is the extraction destination.
        {
          code: read("features/billing/types/index.ts"),
          filename: file("features/billing/types/index.ts"),
        },
      ],
      invalid: [
        {
          code: read("features/billing/date-range.ts"),
          filename: file("features/billing/date-range.ts"),
          errors: [
            {
              message:
              `type "DateRange" is imported by src/features/billing/hooks/use-date-filter.ts without using the code in this file. Extract it to a types/ or schemas/ folder. ${DOC}`,
            },
          ],
        },
      ],
    });
  },
);
