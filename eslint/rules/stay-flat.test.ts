import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { stayFlatRule } from "./stay-flat";

/**
 * The rule reads the whole tree from disk, so the fixture is a real project.
 * Node runs each test file in its own process, which makes the `chdir` below
 * safe: the rule resolves its source root from the working directory.
 */
const FIXTURE: Record<string, string> = {
  // A flat component that owns exclusive children: must be nested.
  "features/blog/BlogPage.tsx":
    'import { BlogHeader } from "./blog-header";\nexport function BlogPage() { return <BlogHeader />; }\n',
  "features/blog/blog-header.tsx": "export function BlogHeader() { return <header />; }\n",
  "features/blog/blog-footer.tsx": "export function BlogFooter() { return <footer />; }\n",
  "features/blog/blog-page-shell.tsx":
    'import { BlogFooter } from "./blog-footer";\nexport function BlogPageShell() { return <BlogFooter />; }\n',

  // A flat component whose support files are not components: stays flat.
  "features/stream/stream-player.tsx":
    'import { useStreamStatus } from "./hooks/use-stream-status";\nexport function StreamPlayer() { return <div />; }\n',
  "features/stream/hooks/use-stream-status.ts": "export function useStreamStatus() { return true; }\n",

  // A sibling component shared with another component is not exclusive.
  "features/payments/payment-summary.tsx":
    'import { StatusBadge } from "./status-badge";\nexport function PaymentSummary() { return <StatusBadge />; }\n',
  "features/payments/status-badge.tsx": "export function StatusBadge() { return <span />; }\n",
  "features/payments/payment-history.tsx":
    'import { StatusBadge } from "./status-badge";\nexport function PaymentHistory() { return <StatusBadge />; }\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-stay-flat-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const DOC = "See docs/next-codebase-guide/rules/folder-nesting-rule.md";

void describe(
  "A component MUST stay flat until it has one or more exclusive child components, then MUST be nested in a folder with the same name.",
  () => {
    ruleTester.run("stay-flat", stayFlatRule, {
      valid: [
        // Support files are not components, so the component stays flat.
        {
          code: read("features/stream/stream-player.tsx"),
          filename: file("features/stream/stream-player.tsx"),
        },
        // A sibling used by another component is not an exclusive child.
        {
          code: read("features/payments/payment-summary.tsx"),
          filename: file("features/payments/payment-summary.tsx"),
        },
      ],
      invalid: [
        {
          code: read("features/blog/BlogPage.tsx"),
          filename: file("features/blog/BlogPage.tsx"),
          errors: [
            {
            message:
              `This component has exclusive child component(s) BlogHeader; nest it in a folder named after it inside src/features/blog/. ${DOC}`,
            },
          ],
        },
      ],
    });
  },
);
