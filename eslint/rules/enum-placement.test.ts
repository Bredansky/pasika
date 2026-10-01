import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { enumPlacementRule } from "./enum-placement";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-enum-placement-")));
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const MESSAGE =
  "A TypeScript enum must live in a constants/ folder because it creates runtime values as well as a type. See docs/next-codebase-guide/rules/constants-rule.md";

void describe("A TypeScript `enum` MUST always live in a `constants/` folder because it creates runtime values as well as a type.", () => {
  ruleTester.run("enum-placement", enumPlacementRule, {
    valid: [
      {
        code: 'export enum InvoiceStatus { Draft = "draft", Ready = "ready" }',
        filename: file("features/billing/constants/invoice-status.ts"),
      },
      {
        code: 'const enum InternalStatus { Draft = "draft", Ready = "ready" }',
        filename: file("constants/internal-status.ts"),
      },
    ],
    invalid: [
      {
        code: 'export enum InvoiceStatus { Draft = "draft", Ready = "ready" }',
        filename: file("features/billing/types/invoice-status.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'enum InternalStatus { Draft = "draft" } export function statusLabel() { return InternalStatus.Draft; }',
        filename: file("features/billing/utils/status-label.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: 'export const enum ViewMode { Grid = "grid", List = "list" }',
        filename: file("features/billing/view-mode.ts"),
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
