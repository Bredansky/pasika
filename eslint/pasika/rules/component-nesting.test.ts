import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester.js";
import { componentNestingRule } from "./component-nesting.js";

/**
 * The rule reads the whole tree from disk, so the fixture is a real project.
 * Node runs each test file in its own process, which makes the `chdir` below
 * safe: the rule resolves its source root from the working directory.
 */
const FIXTURE: Record<string, string> = {
  // Nested only because of support files: no exclusive child components.
  "features/blog/BlogPage/index.ts": 'export { BlogPage } from "./BlogPage";\n',
  "features/blog/BlogPage/BlogPage.tsx": "export function BlogPage() { return <div />; }\n",
  "features/blog/BlogPage/hooks/use-blog-filter.ts": "export function useBlogFilter() { return true; }\n",
  "features/blog/listing.tsx":
    'import { BlogPage } from "./BlogPage";\nexport function Listing() { return <BlogPage />; }\n',

  // Nested with an exclusive child component: the nesting is justified.
  "features/orders/OrderCard/index.ts": 'export { OrderCard } from "./OrderCard";\n',
  "features/orders/OrderCard/OrderCard.tsx":
    'import { OrderBadge } from "./order-badge";\nexport function OrderCard() { return <OrderBadge />; }\n',
  "features/orders/OrderCard/order-badge.tsx": "export function OrderBadge() { return <span />; }\n",
  "features/orders/orders-page.tsx":
    'import { OrderCard } from "./OrderCard";\nexport function OrdersPage() { return <OrderCard />; }\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-component-nesting-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);
const read = (relativePath: string): string => FIXTURE[relativePath] ?? "";

const DOC = "See docs/code-organization-guide/rules/folder-nesting-rule.md";

void describe("A component MUST NOT be nested only because it has support files.", () => {
  ruleTester.run("component-nesting", componentNestingRule, {
    valid: [
      // A nested folder with an exclusive child component is justified.
      {
        code: read("features/orders/OrderCard/OrderCard.tsx"),
        filename: file("features/orders/OrderCard/OrderCard.tsx"),
      },
    ],
    invalid: [
      {
        code: read("features/blog/BlogPage/BlogPage.tsx"),
        filename: file("features/blog/BlogPage/BlogPage.tsx"),
        errors: [
          {
            message:
              `This component is nested in src/features/blog/BlogPage/ but its folder has no exclusive child components — only support files. Flatten it back into src/features/blog/. ${DOC}`,
          },
        ],
      },
    ],
  });
});
