import { describe, ruleTester, srcFile } from "../rule-tester.js";
import { filenameCaseRule } from "./filename-case.js";

void describe("A file that does not define a component MUST have a kebab-case name.", () => {
  ruleTester.run("filename-case", filenameCaseRule, {
    valid: [
      { code: "export function formatDate() {}", filename: srcFile("utils/format-date.ts") },
      { code: "export function useInvoiceSort() {}", filename: srcFile("features/billing/hooks/use-invoice-sort.ts") },
      { code: "export const maxRetries = 3;", filename: srcFile("constants/index.ts") },
      // Outside src/ the convention does not apply.
      { code: "export function formatDate() {}", filename: "scripts/formatDate.ts" },
    ],
    invalid: [
      {
        code: "export function formatDate() {}",
        filename: srcFile("utils/formatDate.ts"),
        errors: [
          {
            message:
              'Filename "formatDate.ts" does not match pasika conventions. Non-component files must use kebab-case.',
          },
        ],
      },
      {
        code: "export function useInvoiceSort() {}",
        filename: srcFile("features/billing/hooks/useInvoiceSort.ts"),
        errors: 1,
      },
      {
        code: "export const maxRetries = 3;",
        filename: srcFile("features/billing/constants/max_retries.ts"),
        errors: 1,
      },
    ],
  });
});
