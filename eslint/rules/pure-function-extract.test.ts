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
      // route.ts may export exactly the names Next.js requires
      {
        code: 'export async function GET() { return new Response("ok"); }',
        filename: srcFile("app/api/health/route.ts"),
      },
      {
        code: 'export const dynamic = "force-dynamic";',
        filename: srcFile("app/api/health/route.ts"),
      },
      {
        code: "export function generateStaticParams() { return []; }",
        filename: srcFile("app/posts/[slug]/route.ts"),
      },
      // A pure helper nested inside a route.ts handler is not module-scope
      {
        code: "export async function GET() { function helper() { return 42; } return new Response(String(helper())); }",
        filename: srcFile("app/api/health/route.ts"),
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
              'Extract pure function "formatPrice" to utils/. See docs/next-codebase-guide/rules/utilities-rule.md',
          },
        ],
      },
      // Arrow function that is pure
      {
        code: "export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);",
        filename: srcFile("features/billing/invoice.tsx"),
        errors: [
          {
            message: 'Extract pure function "clamp" to utils/. See docs/next-codebase-guide/rules/utilities-rule.md',
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
              'Extract pure function "formatCurrency" to utils/. See docs/next-codebase-guide/rules/utilities-rule.md',
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
              'Extract pure function "formatDate" to utils/. See docs/next-codebase-guide/rules/utilities-rule.md',
          },
        ],
      },
      // Unexported module-scope helper in route.ts — its handler is a dead end
      // for the import graph, so no other file will ever demand extraction.
      {
        code: 'function absolutizeUrl(url) { return new URL(url, "https://example.com").toString(); }\nexport async function GET() { return new Response(absolutizeUrl("/x")); }',
        filename: srcFile("app/api/health/route.ts"),
        errors: [
          {
            message:
              'Extract pure function "absolutizeUrl" to utils/. See docs/next-codebase-guide/rules/utilities-rule.md',
          },
        ],
      },
      // Module-scope arrow helper in route.ts, exported under a non-route name
      {
        code: 'export const formatJobId = (id) => "job-" + id;\nexport async function GET() { return new Response(formatJobId("1")); }',
        filename: srcFile("app/api/health/route.ts"),
        errors: [
          {
            message:
              'Extract pure function "formatJobId" to utils/. See docs/next-codebase-guide/rules/utilities-rule.md',
          },
        ],
      },
    ],
  });
});
