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
    valid: [valid("features/billing/utils/format-date.ts")],
    invalid: [
      {
        ...valid("features/billing/helpers/format-date.ts"),
        errors: [{ message: "Move this file to a utils/ folder; helpers/ is not a recognized support folder." }],
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

void describe("src/app/ MUST contain Next.js App Router framework-convention files and assets, plus styles required by routing files, but MUST NOT contain ordinary components or support folders.", () => {
  ruleTester.run("application-structure", applicationStructureRule, {
    valid: [{ code: "export default function Page() { return <span />; }", filename: file("app/invoices/page.tsx") }],
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
