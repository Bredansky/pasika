import { describe, ruleTester, srcFile } from "../rule-tester.js";
import { namedExportsRule } from "./named-exports.js";

const MESSAGE =
  "Files that export values must use named exports unless a framework or third-party package requires a different export style for that file. " +
  "See docs/code-organization-guide/rules/exports-and-imports-rule.md";

void describe("A file that exports values MUST use named exports unless a framework or third-party package requires a different export style for that file.", () => {
  ruleTester.run("named-exports", namedExportsRule, {
    valid: [
      { code: "export function formatDate() {}", filename: srcFile("utils/format-date.ts") },
      { code: "export default function Page() { return <main />; }", filename: srcFile("app/page.tsx") },
      { code: "export default function Layout() { return <main />; }", filename: srcFile("app/account/layout.tsx") },
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
