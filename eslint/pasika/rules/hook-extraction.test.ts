import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { hookExtractionRule } from "./hook-extraction";

/**
 * The rule reads the whole tree from disk, so the fixture is a real project.
 * Node runs each test file in its own process, which makes the `chdir` below
 * safe: the rule resolves its source root from the working directory.
 */
const FIXTURE: Record<string, string> = {
  // A hook still in its declaring component file, used by two consumers.
  "features/billing/invoice.tsx":
    'export function useInvoiceSort(invoices: string[]) { return invoices; }\nexport function Invoice() { return <div />; }\n',
  "features/billing/invoice-summary.tsx":
    'import { useInvoiceSort } from "./invoice";\nexport function InvoiceSummary() { return <div />; }\n',
  "features/billing/payment-history.tsx":
    'import { useInvoiceSort } from "./invoice";\nexport function PaymentHistory() { return <div />; }\n',

  // A hook already extracted to its own hooks/ file, used by two consumers.
  "features/stream/hooks/use-stream-status.ts":
    "export function useStreamStatus() { return true; }\n",
  "features/stream/stream-player.tsx":
    'import { useStreamStatus } from "./hooks/use-stream-status";\nexport function StreamPlayer() { return <div />; }\n',
  "features/stream/stream-card.tsx":
    'import { useStreamStatus } from "./hooks/use-stream-status";\nexport function StreamCard() { return <div />; }\n',

  // A hook with a single consumer may stay inline.
  "features/stream/stream-chat.tsx":
    'export function useChatScroll() { return true; }\nexport function StreamChat() { return <div />; }\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-hook-extraction-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const DOC = "See docs/code-organization-guide/rules/hook-extraction-rule.md";

void describe("A custom hook MUST be extracted to its own file when two or more consumers use it.", () => {
  ruleTester.run("hook-extraction", hookExtractionRule, {
    valid: [
      // Extracted hook in its own hooks/ file: no report.
      {
        code: read("features/stream/hooks/use-stream-status.ts"),
        filename: file("features/stream/hooks/use-stream-status.ts"),
      },
      // Hook with a single consumer may stay inline.
      {
        code: read("features/stream/stream-chat.tsx"),
        filename: file("features/stream/stream-chat.tsx"),
      },
    ],
    invalid: [
      {
        code: read("features/billing/invoice.tsx"),
        filename: file("features/billing/invoice.tsx"),
        errors: [
          {
            message: `Hook "useInvoiceSort" has 2 consumers; extract it to its own file in a hooks/ folder. ${DOC}`,
          },
        ],
      },
    ],
  });
});
