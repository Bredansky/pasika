import { describe, ruleTester, srcFile } from "../rule-tester";
import { dataTestIdCaseRule } from "./data-testid-case";

void describe("A smart component with one outer DOM element in every rendered result MUST set data-testid on that element, and its value MUST match the component name in PascalCase.", () => {
  ruleTester.run("data-testid-case", dataTestIdCaseRule, {
    valid: [
      {
        code: `export function AccountPanel() {\n  const [open] = useState(false);\n  return <section data-testid="AccountPanel">{String(open)}</section>;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
    ],
    invalid: [
      {
        code: `export function AccountPanel() {\n  const [open] = useState(false);\n  return <section>{String(open)}</section>;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message: 'Smart component "AccountPanel" with one outer DOM element must set data-testid="AccountPanel".',
          },
        ],
      },
      {
        code: `export function AccountPanel() {\n  const [open] = useState(false);\n  return <section data-testid="account-panel">{String(open)}</section>;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message: 'data-testid for smart component "AccountPanel" must be PascalCase: expected "AccountPanel".',
          },
        ],
      },
    ],
  });
});

void describe("A dumb component MAY set data-testid on its root element, and the value MUST be kebab-case.", () => {
  ruleTester.run("data-testid-case", dataTestIdCaseRule, {
    valid: [
      {
        code: 'export function AccountPanel() { return <section data-testid="account-panel" />; }',
        filename: srcFile("features/account/account-panel.tsx"),
      },
      {
        code: "export function AccountPanel() { return <section />; }",
        filename: srcFile("features/account/account-panel.tsx"),
      },
    ],
    invalid: [
      {
        code: 'export function AccountPanel() { return <section data-testid="AccountPanel" />; }',
        filename: srcFile("features/account/account-panel.tsx"),
        errors: [
          {
            message: 'data-testid for dumb component "AccountPanel" must be kebab-case: expected "account-panel".',
          },
        ],
      },
    ],
  });
});

void describe("A smart component without one outer DOM element in every rendered result MAY omit data-testid.", () => {
  ruleTester.run("data-testid-case", dataTestIdCaseRule, {
    valid: [
      {
        code: `export function AccountPanel() {\n  const [open] = useState(false);\n  return open ? <section /> : <aside />;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
    ],
    invalid: [],
  });
});

void describe("Next.js App Router routing files MUST use their required kebab-case names and are exempt from smart/dumb file-name and data-testid requirements.", () => {
  ruleTester.run("data-testid-case", dataTestIdCaseRule, {
    valid: [
      {
        code: `export default function Page() {\n  return <main>Hello</main>;\n}`,
        filename: srcFile("app/page.tsx"),
      },
      {
        code: `export default function Layout({ children }: { children: React.ReactNode }) {\n  return <div>{children}</div>;\n}`,
        filename: srcFile("app/layout.tsx"),
      },
    ],
    invalid: [],
  });
});
