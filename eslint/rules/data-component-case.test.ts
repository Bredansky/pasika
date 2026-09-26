import { describe, ruleTester, srcFile } from "../rule-tester";
import { dataComponentCaseRule } from "./data-component-case";

void describe("A smart component MUST expose exactly one stable `data-component` marker for itself in every rendered result, and its value MUST match the component name in `PascalCase`; markers that belong to nested components do not count toward this requirement.", () => {
  ruleTester.run("data-component-case", dataComponentCaseRule, {
    valid: [
      {
        code: `export async function AccountPanel() {
  const open = await zodFetch({ url, responseSchema });
  return <section data-component="AccountPanel">{String(open)}</section>;
}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
      {
        code: `export async function AccountPanel() {
  const open = await zodFetch({ url, responseSchema });
  if (!open) return null;
  return <section data-component="AccountPanel">{String(open)}</section>;
}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
      {
        code: `export async function AccountPanel() {
  const open = await zodFetch({ url, responseSchema });
  return open
    ? <section data-component="AccountPanel" />
    : <aside data-component="AccountPanel" />;
}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
    ],
    invalid: [
      {
        code: `export async function AccountPanel() {
  const open = await zodFetch({ url, responseSchema });
  return <section>{String(open)}</section>;
}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message:
              'Smart component "AccountPanel" must expose exactly one stable data-component="AccountPanel" marker in every rendered result. ' +
              "Place it on the existing meaningful DOM surface or forward it to the child component that renders that surface. " +
              "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
          },
        ],
      },
      {
        code: `export async function AccountPanel() {
  const open = await zodFetch({ url, responseSchema });
  return <section data-component="account-panel">{String(open)}</section>;
}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message:
              'data-component for smart component "AccountPanel" must match the component name: expected "AccountPanel".',
          },
        ],
      },
      {
        code: `export async function AccountPanel() {
  const open = await zodFetch({ url, responseSchema });
  return <section data-component={panelName}>{String(open)}</section>;
}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message:
              'data-component for smart component "AccountPanel" must match the component name: expected "AccountPanel".',
          },
        ],
      },
    ],
  });
});

void describe("A component's `data-component` marker MUST live only on its existing meaningful DOM surface, and the component MUST NOT add additional `data-component` markers to its descendants on its own behalf.", () => {
  ruleTester.run("data-component-case", dataComponentCaseRule, {
    valid: [
      {
        code: `export async function AccountPanel() {
  const open = await zodFetch({ url, responseSchema });
  return <section data-component="AccountPanel"><span>{String(open)}</span></section>;
}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
    ],
    invalid: [
      {
        code: `export async function AccountPanel() {
  const open = await zodFetch({ url, responseSchema });
  return (
    <section data-component="AccountPanel">
      <span data-component="AccountPanelLabel">{String(open)}</span>
    </section>
  );
}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message:
              'Smart component "AccountPanel" must expose exactly one stable data-component="AccountPanel" marker in every rendered result. ' +
              "Place it on the existing meaningful DOM surface or forward it to the child component that renders that surface. " +
              "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
          },
        ],
      },
    ],
  });
});

void describe("If a smart component's meaningful DOM surface is rendered by a child component, it MUST pass `data-component` to that child and the child MUST forward the prop; the smart component MUST NOT add an otherwise unnecessary DOM wrapper only to host `data-component`.", () => {
  ruleTester.run("data-component-case", dataComponentCaseRule, {
    valid: [
      {
        code: `export function CredentialFormDialog() {
  const handleSuccess = () => save();
  return (
    <Dialog>
      <DialogTrigger />
      <DialogContent data-component="CredentialFormDialog">
        <CredentialForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}`,
        filename: srcFile("features/credentials/CredentialFormDialog.tsx"),
      },
    ],
    invalid: [
      {
        code: `export function CredentialFormDialog() {
  const handleSuccess = () => save();
  return (
    <Dialog>
      <DialogTrigger />
      <DialogContent>
        <CredentialForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}`,
        filename: srcFile("features/credentials/CredentialFormDialog.tsx"),
        errors: [
          {
            message:
              'Smart component "CredentialFormDialog" must expose exactly one stable data-component="CredentialFormDialog" marker in every rendered result. ' +
              "Place it on the existing meaningful DOM surface or forward it to the child component that renders that surface. " +
              "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
          },
        ],
      },
    ],
  });
});

void describe("A dumb component MAY expose one `data-component` marker on its meaningful DOM surface, and when present its value MUST be `kebab-case`.", () => {
  ruleTester.run("data-component-case", dataComponentCaseRule, {
    valid: [
      {
        code: 'export function AccountPanel() { return <section data-component="account-panel" />; }',
        filename: srcFile("features/account/account-panel.tsx"),
      },
      {
        code: "export function AccountPanel() { return <section />; }",
        filename: srcFile("features/account/account-panel.tsx"),
      },
    ],
    invalid: [
      {
        code: 'export function AccountPanel() { return <section data-component="AccountPanel" />; }',
        filename: srcFile("features/account/account-panel.tsx"),
        errors: [
          {
            message: 'data-component for dumb component "AccountPanel" must be kebab-case: expected "account-panel".',
          },
        ],
      },
      {
        code: 'export function AccountPanel() { return <section data-component="account-panel"><span data-component="label" /></section>; }',
        filename: srcFile("features/account/account-panel.tsx"),
        errors: [
          {
            message:
              'Dumb component "AccountPanel" may omit data-component, but when present it must expose exactly one stable data-component="account-panel" marker on its meaningful surface.',
          },
        ],
      },
    ],
  });
});

void describe("Next.js App Router routing files MUST use their required kebab-case names and are exempt from smart/dumb file-name and data-component requirements.", () => {
  ruleTester.run("data-component-case", dataComponentCaseRule, {
    valid: [
      {
        code: "export const value = 1;",
        filename: srcFile("features/account/value.ts"),
      },
      {
        code: `export default function Page() {
  return <main>Hello</main>;
}`,
        filename: srcFile("app/page.tsx"),
      },
      {
        code: `export default function NotFound() {
  return <main data-component="Anything">Missing</main>;
}`,
        filename: srcFile("app/not-found.tsx"),
      },
    ],
    invalid: [],
  });
});
