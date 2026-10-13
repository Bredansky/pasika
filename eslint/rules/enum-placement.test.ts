import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { enumPlacementRule } from "./enum-placement";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-enum-placement-")));
process.chdir(root);
const file = (name: string, code: string): { filename: string; code: string } => {
  const filename = path.join(root, "src", name);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, code);
  return { filename, code };
};

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const SHARED = `An enum imported by another file must live in a constants/ folder at its CCF; keep file-local enums beside their consumers. ${DOC}`;
const SINGLE = `A single named string or number value must be a const, not a one-member enum. ${DOC}`;

file(
  "features/billing/invoice.ts",
  'import { InvoiceStatus } from "./types/invoice-status"; export const status = InvoiceStatus.Draft;',
);
file("features/billing/view.ts", 'import { ViewMode } from "./view-mode"; export const viewMode = ViewMode.Grid;');
file(
  "features/billing/order.ts",
  'import { OrderStatus } from "./constants/order-status"; export const orderStatus = OrderStatus.Draft;',
);

void describe("A TypeScript `enum` MUST remain in its declaring file until another file imports it; only then MUST it be extracted for sharing.", () => {
  ruleTester.run("enum-placement", enumPlacementRule, {
    valid: [
      file(
        "features/billing/utils/status-label.ts",
        'enum InternalStatus { Draft = "draft", Ready = "ready" } export function label() { return InternalStatus.Draft; }',
      ),
      file(
        "features/billing/local-export.ts",
        'export enum LocalMode { Grid = "grid", List = "list" } export const current = LocalMode.Grid;',
      ),
      file(
        "features/billing/constants/order-status.ts",
        'export enum OrderStatus { Draft = "draft", Ready = "ready" }',
      ),
    ],
    invalid: [
      {
        ...file(
          "features/billing/types/invoice-status.ts",
          'export enum InvoiceStatus { Draft = "draft", Ready = "ready" }',
        ),
        errors: [{ message: SHARED }],
      },
      {
        ...file("features/billing/view-mode.ts", 'export const enum ViewMode { Grid = "grid", List = "list" }'),
        errors: [{ message: SHARED }],
      },
    ],
  });
});

void describe("A single named string or number value MUST be represented by a `const`, not a one-member `enum`; a value written only once MAY remain inline.", () => {
  ruleTester.run("enum-placement", enumPlacementRule, {
    valid: [
      file("features/billing/one-const.ts", 'const publishRoute = "/api/publish"; export const send = publishRoute;'),
      file("features/billing/numeric-const.ts", "const width = 360; export const dimension = width;"),
    ],
    invalid: [
      {
        ...file("features/billing/utils/one-value.ts", 'enum SingleRoute { Publish = "/api/publish" }'),
        errors: [{ message: SINGLE }],
      },
      {
        ...file("features/billing/constants/one-value.ts", "export enum SingleNumber { Width = 360 }"),
        errors: [{ message: SINGLE }],
      },
    ],
  });
});
