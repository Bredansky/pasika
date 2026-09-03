import { describe, ruleTester, srcFile } from "../rule-tester";
import { namedExportsRule } from "./named-exports";

const MESSAGE =
  "Files that export values must use named exports unless a framework or third-party package requires a different export style for that file. " +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

void describe("A file that exports values MUST use named exports unless a framework or third-party package requires a different export style for that file.", () => {
  ruleTester.run("named-exports", namedExportsRule, {
    valid: [
      { code: "export function formatDate() {}", filename: srcFile("utils/format-date.ts") },
      { code: "export default function Page() { return <main />; }", filename: srcFile("app/page.tsx") },
      { code: "export default function Layout() { return <main />; }", filename: srcFile("app/account/layout.tsx") },
      // Next.js routing files and file conventions require default exports.
      {
        code: "export default function GlobalError() { return <html><body /></html>; }",
        filename: srcFile("app/global-error.tsx"),
      },
      { code: "export default function robots() { return {}; }", filename: srcFile("app/robots.ts") },
      { code: "export default function sitemap() { return []; }", filename: srcFile("app/sitemap.ts") },
      { code: "export default function Icon() { return null; }", filename: srcFile("app/icon.tsx") },
      { code: "export default function AppleIcon() { return null; }", filename: srcFile("app/apple-icon.tsx") },
    ],
    invalid: [
      {
        code: "export default function formatDate() {}",
        filename: srcFile("utils/format-date.ts"),
        errors: [{ message: MESSAGE }],
      },
      {
        code: "export default function Card() { return <article />; }",
        filename: srcFile("features/billing/card.tsx"),
        errors: [{ message: MESSAGE }],
      },
    ],
  });
});
