import { describe, ruleTester, srcFile } from "../rule-tester";
import { pureFunctionExtractRule } from "./pure-function-extract";

void describe("A pure function MUST be extracted to utils/, even when it has one consumer.", () => {
  ruleTester.run("pure-function-extract", pureFunctionExtractRule, {
    valid: [
      // Component files in src/app/ are not checked
      {
        code: 'export function formatPrice(n) { return "$" + n.toFixed(2); }',
        filename: srcFile("app/page.tsx"),
      },
      // Component names are exempt
      {
        code: "export function Sidebar({ children }) { return <aside>{children}</aside>; }",
        filename: srcFile("features/dashboard/dashboard.tsx"),
      },
      // Hook names are exempt
      {
        code: "export function useTheme() { return useContext(ThemeContext); }",
        filename: srcFile("features/dashboard/dashboard.tsx"),
      },
      // Functions in utils/ are fine
      {
        code: 'export function formatPrice(n) { return "$" + n.toFixed(2); }',
        filename: srcFile("features/billing/utils/format-price.ts"),
      },
      // Non-exported functions are fine (not visible outside the file)
      {
        code: "function helper() { return 42; }",
        filename: srcFile("features/dashboard/dashboard.tsx"),
      },
      // Functions using hooks are fine (they have side effects)
      {
        code: "export function useCount() { const [n, setN] = useState(0); return n; }",
        filename: srcFile("features/dashboard/dashboard.tsx"),
      },
      // Variables that are not functions are fine
      {
        code: "export const PI = 3.14;",
        filename: srcFile("features/dashboard/dashboard.tsx"),
      },
    ],
    invalid: [
      // Pure function in a component file
      {
        code: 'export function formatPrice(n) { return "$" + n.toFixed(2); }',
        filename: srcFile("features/billing/invoice.tsx"),
        errors: [
          {
            message:
              'Extract pure function "formatPrice" to utils/. See docs/code-organization-guide/rules/utilities-rule.md',
          },
        ],
      },
      // Arrow function that is pure
      {
        code: "export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);",
        filename: srcFile("features/billing/invoice.tsx"),
        errors: [
          {
            message:
              'Extract pure function "clamp" to utils/. See docs/code-organization-guide/rules/utilities-rule.md',
          },
        ],
      },
      // Function expression exported as variable
      {
        code: 'export const formatCurrency = function (n) { return "$" + n.toFixed(2); };',
        filename: srcFile("features/billing/invoice.tsx"),
        errors: [
          {
            message:
              'Extract pure function "formatCurrency" to utils/. See docs/code-organization-guide/rules/utilities-rule.md',
          },
        ],
      },
      // Pure function in shared/ component
      {
        code: "export function formatDate(d) { return d.toISOString(); }",
        filename: srcFile("shared/date-utils.tsx"),
        errors: [
          {
            message:
              'Extract pure function "formatDate" to utils/. See docs/code-organization-guide/rules/utilities-rule.md',
          },
        ],
      },
    ],
  });
});
