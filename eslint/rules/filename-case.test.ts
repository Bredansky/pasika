import { describe, ruleTester, srcFile } from "../rule-tester";
import { filenameCaseRule } from "./filename-case";

void describe("A smart component file name MUST be PascalCase.tsx.", () => {
  ruleTester.run("filename-case", filenameCaseRule, {
    valid: [
      {
        code: "export function AccountPanel() { const handleSave = () => save(); return <ProfileCard onSave={handleSave} />; }",
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
    ],
    invalid: [
      {
        code: "export function AccountPanel() { const handleSave = () => save(); return <ProfileCard onSave={handleSave} />; }",
        filename: srcFile("features/account/account-panel.tsx"),
        errors: [
          {
            message: 'Smart component files must use PascalCase.tsx. Filename "account-panel.tsx" is not PascalCase.',
          },
        ],
      },
    ],
  });
});

void describe("A component that fetches data through zodFetch is smart and MUST be PascalCase.tsx.", () => {
  ruleTester.run("filename-case", filenameCaseRule, {
    valid: [
      {
        code: "export async function HomeFeed() { const data = await zodFetch({ url, responseSchema }); return <section />; }",
        filename: srcFile("features/home/HomeFeed.tsx"),
      },
    ],
    invalid: [
      {
        code: "export async function HomeFeed() { const data = await zodFetch({ url, responseSchema }); return <section />; }",
        filename: srcFile("features/home/home-feed.tsx"),
        errors: [
          {
            message: 'Smart component files must use PascalCase.tsx. Filename "home-feed.tsx" is not PascalCase.',
          },
        ],
      },
    ],
  });
});

void describe("A dumb component file name MUST be kebab-case.tsx.", () => {
  ruleTester.run("filename-case", filenameCaseRule, {
    valid: [
      {
        code: "export function AccountPanel() { return <section />; }",
        filename: srcFile("features/account/account-panel.tsx"),
      },
      {
        code: "export function AccountPanel() { useMemo(() => 1, []); return <section />; }",
        filename: srcFile("features/account/account-panel.tsx"),
      },
      {
        code: "export async function AccountPanel() { const value = await localCalculation(); return <section>{value}</section>; }",
        filename: srcFile("features/account/account-panel.tsx"),
      },
    ],
    invalid: [
      {
        code: "export function AccountPanel() { return <section />; }",
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message: 'Dumb component files must use kebab-case.tsx. Filename "AccountPanel.tsx" is not kebab-case.',
          },
        ],
      },
      {
        code: "function Button() { return <button />; } export { Button };",
        filename: srcFile("shared/Button.tsx"),
        errors: [
          {
            message: 'Dumb component files must use kebab-case.tsx. Filename "Button.tsx" is not kebab-case.',
          },
        ],
      },
    ],
  });
});

void describe("Next.js routing files and file conventions MUST keep their required kebab-case names regardless of the component they export.", () => {
  ruleTester.run("filename-case", filenameCaseRule, {
    valid: [
      {
        code: "export default function GlobalError() { return <html><body /></html>; }",
        filename: srcFile("app/global-error.tsx"),
      },
      {
        code: "export default function robots() { return {}; }",
        filename: srcFile("app/robots.ts"),
      },
      {
        code: "export default function Icon() { return null; }",
        filename: srcFile("app/icon.tsx"),
      },
      {
        code: "export default function AppleIcon() { return null; }",
        filename: srcFile("app/apple-icon.tsx"),
      },
      {
        code: "export default function sitemap() { return []; }",
        filename: srcFile("app/sitemap.ts"),
      },
    ],
    invalid: [],
  });
});

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
