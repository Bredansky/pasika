import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { applicationStructureRule } from "./application-structure";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-structure-")));
const file = (relativePath: string): string => path.join(root, "src", relativePath);
const write = (relativePath: string, contents: string): void => {
  const filename = file(relativePath);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, contents);
};

write("features/billing/invoice.tsx", "export function Invoice() { return <span />; }\n");
write("features/billing/utils/format-date.ts", 'export function formatDate() { return ""; }\n');
write("shared/button.tsx", "export function Button() { return <button />; }\n");
write("utils/format-date.ts", 'export function formatDate() { return ""; }\n');
write("app/invoices/page.tsx", "export default function Page() { return <span />; }\n");
write("config/home-feed/index.ts", "export const homeFeedConfig = {};\n");
write("features/billing/helpers/format-date.ts", 'export function formatDate() { return ""; }\n');
write("config/home-feed/helpers/build-url.ts", 'export function buildUrl() { return ""; }\n');
write("features/billing/utils/invoice-row.tsx", "export function InvoiceRow() { return <div />; }\n");
// Mixed-kind support files: a file's folder matches its primary purpose, not
// incidental type exports (zod's inferred types, return-type interfaces, keyof
// types).
write(
  "features/billing/schemas/invoice-schema.ts",
  "import { z } from \"zod\";\nexport const invoiceSchema = z.object({});\nexport type Invoice = z.infer<typeof invoiceSchema>;\n",
);
write(
  "features/billing/utils/format-invoice.ts",
  "export interface FormattedInvoice { total: number; }\nexport function formatInvoice(input: FormattedInvoice) { return input; }\n",
);
write(
  "features/billing/constants/status-colors.ts",
  "export const statusColors = { paid: \"#000\", open: \"#fff\" };\nexport type StatusColor = keyof typeof statusColors;\n",
);
write("features/billing/types/invoice.ts", "export interface InvoiceRow { id: string; }\n");
// A schema-plus-type file parked in utils/ must still be sent to schemas/.
write(
  "features/billing/utils/misplaced-schema.ts",
  "import { z } from \"zod\";\nexport const paymentSchema = z.object({});\nexport type Payment = z.infer<typeof paymentSchema>;\n",
);
// A proper nested component folder: same-named component + index that re-exports it.
write("features/billing/InvoicePanel/index.ts", 'export { InvoicePanel } from "./InvoicePanel";\n');
write("features/billing/InvoicePanel/InvoicePanel.tsx", "export function InvoicePanel() { return <main />; }\n");
// A folder that is neither support nor component: a component inside it is not named after the folder.
write("features/billing/random-folder/foo.tsx", "export function Foo() { return <main />; }\n");
// A component folder missing its index barrel.
write("features/billing/BarePanel/BarePanel.tsx", "export function BarePanel() { return <main />; }\n");
process.chdir(root);

const valid = (relativePath: string): { code: string; filename: string } => ({
  code: "export const value = 1;",
  filename: file(relativePath),
});

void describe("src/ MUST contain only the app/, compositions/, features/, and shared/ folders, the root support folders, config/, locales/, and the files a framework requires at the src root.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [valid("utils/format-date.ts"), valid("features/billing/invoice.tsx")],
    invalid: [
      {
        ...valid("lib/format-date.ts"),
        errors: [
          {
            message:
              'Move this source file under an allowed src/ folder; "src/lib/" is not part of the application structure.',
          },
        ],
      },
    ],
  });
});

void describe("src/features/ MUST contain only feature folders.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [valid("features/billing/invoice.tsx")],
    invalid: [
      {
        ...valid("features/utils/format-date.ts"),
        errors: [
          {
            message:
              'Move this support folder inside a feature folder; "src/features/utils/" does not belong to a feature.',
          },
        ],
      },
    ],
  });
});

void describe("A folder holding support files MUST be named hooks/, types/, schemas/, constants/, or utils/, matching the kind of file it holds.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [
      valid("features/billing/utils/format-date.ts"),
      // A file's primary kind decides its folder; inferred types do not make a
      // schema file a types file, and return-type interfaces do not make a
      // utils file a types file.
      valid("features/billing/schemas/invoice-schema.ts"),
      valid("features/billing/utils/format-invoice.ts"),
      valid("features/billing/constants/status-colors.ts"),
      valid("features/billing/types/invoice.ts"),
    ],
    invalid: [
      {
        ...valid("features/billing/helpers/format-date.ts"),
        errors: [{ message: "Move this file to a utils/ folder; helpers/ is not a recognized support folder." }],
      },
      {
        ...valid("features/billing/utils/misplaced-schema.ts"),
        errors: [{ message: "Move this file to a schemas/ folder; utils/ is reserved for schemas." }],
      },
    ],
  });
});

void describe("A support folder MUST NOT contain a component.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [valid("features/billing/utils/format-date.ts")],
    invalid: [
      {
        code: "export function InvoiceRow() { return <div />; }",
        filename: file("features/billing/utils/invoice-row.tsx"),
        errors: [
          {
            message: "A support folder must not contain a component; move invoice-row.tsx beside utils/.",
          },
        ],
      },
    ],
  });
});

void describe("All configuration modules MUST live in src/config/.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [valid("config/home-feed/index.ts")],
    invalid: [
      {
        code: "export const homeFeedConfig = {} as Record<string, unknown>;",
        filename: file("lib/home-feed-config.ts"),
        errors: [
          {
            message:
              'Move this source file under an allowed src/ folder; "src/lib/" is not part of the application structure.',
          },
        ],
      },
    ],
  });
});

void describe("A configuration module MUST be one src/config/<config-name>/ folder with index.ts as its entry point.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [valid("config/home-feed/index.ts")],
    invalid: [
      {
        ...valid("config/home-feed.ts"),
        errors: [
          {
            message:
              "A configuration module must be a src/config/<config-name>/ folder with index.ts as its entry point.",
          },
        ],
      },
    ],
  });
});

void describe("An extracted configuration type, schema, or utility MUST live in its matching dedicated folder under src/config/<config-name>/.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [valid("config/home-feed/utils/build-url.ts")],
    invalid: [
      {
        ...valid("config/home-feed/helpers/build-url.ts"),
        errors: [
          {
            message: "Move this file to a utils/ folder; helpers/ is not a recognized support folder.",
          },
        ],
      },
    ],
  });
});

void describe("A feature folder, src/compositions/, src/shared/, and a nested component folder MAY each contain support folders, and any other folder in these scopes MUST be a component folder containing a .tsx file with the same name and an index.ts that named-re-exports that component.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [
      {
        code: "export function InvoicePanel() { return <main />; }",
        filename: file("features/billing/InvoicePanel/InvoicePanel.tsx"),
      },
    ],
    invalid: [
      {
        code: "export function Foo() { return <main />; }",
        filename: file("features/billing/random-folder/foo.tsx"),
        errors: [
          {
            message:
              'A folder that is not a support folder must be a component folder; add "random-folder.tsx" to src/features/billing/random-folder/ or move its files into a support folder.',
          },
        ],
      },
      {
        code: "export function BarePanel() { return <main />; }",
        filename: file("features/billing/BarePanel/BarePanel.tsx"),
        errors: [
          {
            message:
              "A component folder must have an index.ts that named-re-exports its component; add index.ts to src/features/billing/BarePanel/.",
          },
        ],
      },
    ],
  });
});

void describe("src/app/ MUST contain Next.js App Router framework-convention files and assets, plus styles required by routing files, but MUST NOT contain ordinary components or support folders.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [
      { code: "export default function Page() { return <span />; }", filename: file("app/invoices/page.tsx") },
      // Framework-convention files keep their Next.js-mandated names in src/app/.
      { code: "export default function GlobalError() { return <html />; }", filename: file("app/global-error.tsx") },
      { code: "export default function Icon() { return <svg />; }", filename: file("app/icon.tsx") },
      { code: "export default function AppleIcon() { return <svg />; }", filename: file("app/apple-icon.tsx") },
      { code: 'export default function Robots() { return "robots"; }', filename: file("app/robots.ts") },
      { code: 'export default function Sitemap() { return "sitemap"; }', filename: file("app/sitemap.ts") },
      // A route handler under src/app/api/ keeps its folder: the route exports a
      // function, but Next.js dictates the location, not the support-folder rule.
      {
        code: "export async function GET() { return Response.json({}); }\n",
        filename: file("app/api/donation-progress/route.ts"),
      },
    ],
    invalid: [
      {
        code: "export function InvoicePanel() { return <span />; }",
        filename: file("app/invoices/invoice-panel.tsx"),
        errors: [
          {
            message:
              "src/app/ may contain routing files and framework assets, but ordinary components and support files must live outside src/app/.",
          },
        ],
      },
    ],
  });
});
