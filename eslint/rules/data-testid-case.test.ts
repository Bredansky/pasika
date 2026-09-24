import { describe, ruleTester, srcFile } from "../rule-tester";
import { dataTestIdCaseRule } from "./data-testid-case";

void describe("A smart component MUST expose exactly one stable `data-testid` anchor for itself in every rendered result, and its value MUST match the component name in `PascalCase`; `data-testid` anchors that belong to nested components do not count toward this requirement.", () => {
  ruleTester.run("data-testid-case", dataTestIdCaseRule, {
    valid: [
      {
        code: `export async function AccountPanel() {\n  const open = await zodFetch({ url, responseSchema });\n  return <section data-testid="AccountPanel">{String(open)}</section>;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
      {
        // `return (...)` wraps the JSX in a ParenthesizedExpression, which is the
        // formatting prettier produces for multi-line returns. Anchor analysis
        // must see through those parens.
        code: `export async function AccountPanel() {\n  const open = await zodFetch({ url, responseSchema });\n  return (\n    <section data-testid="AccountPanel">{String(open)}</section>\n  );\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
      {
        code: `export async function AccountPanel() {\n  const open = await zodFetch({ url, responseSchema });\n  return (\n    <section data-testid="AccountPanel">\n      <ChildSmart data-testid="ChildSmart" open={open} />\n    </section>\n  );\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
    ],
    invalid: [
      {
        code: `export async function AccountPanel() {\n  const open = await zodFetch({ url, responseSchema });\n  return <section>{String(open)}</section>;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message:
              'Smart component "AccountPanel" must expose exactly one stable data-testid="AccountPanel" anchor for itself in every rendered result. ' +
              "Place it on the existing DOM surface or on a child component that forwards data-testid instead of adding an artificial wrapper. " +
              "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
          },
        ],
      },
      {
        code: `export async function AccountPanel() {\n  const open = await zodFetch({ url, responseSchema });\n  return (\n    <section data-testid="account-panel">{String(open)}</section>\n  );\n}`,
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

void describe("A smart component that conditionally renders nothing MAY return null as a guard; the single rendered element MUST still set data-testid.", () => {
  ruleTester.run("data-testid-case", dataTestIdCaseRule, {
    valid: [
      {
        code: `export async function AccountPanel() {\n  const enabled = await zodFetch({ url, responseSchema });\n  if (!enabled) return null;\n  return <section data-testid="AccountPanel">{String(enabled)}</section>;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
    ],
    invalid: [
      {
        code: `export async function AccountPanel() {\n  const enabled = await zodFetch({ url, responseSchema });\n  if (!enabled) return null;\n  return <section>{String(enabled)}</section>;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message:
              'Smart component "AccountPanel" must expose exactly one stable data-testid="AccountPanel" anchor for itself in every rendered result. ' +
              "Place it on the existing DOM surface or on a child component that forwards data-testid instead of adding an artificial wrapper. " +
              "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
          },
        ],
      },
    ],
  });
});

void describe("Each rendered branch of a smart component MUST expose the stable data-testid, even when branches use different DOM tags.", () => {
  ruleTester.run("data-testid-case", dataTestIdCaseRule, {
    valid: [
      {
        code: `export async function VideoHeroPlayer() {\n  const isPlaying = await zodFetch({ url, responseSchema });\n  if (isPlaying) {\n    return (\n      <div data-testid="VideoHeroPlayer" className="h-full w-full">\n        <iframe src="x" />\n      </div>\n    );\n  }\n  return (\n    <div data-testid="VideoHeroPlayer" className="h-full w-full">\n      <button type="button" />\n    </div>\n  );\n}`,
        filename: srcFile("features/home/hero-media/VideoHeroPlayer.tsx"),
      },
    ],
    invalid: [
      {
        code: `export async function VideoHeroPlayer() {\n  const isPlaying = await zodFetch({ url, responseSchema });\n  if (isPlaying) {\n    return (\n      <div className="h-full w-full">\n        <iframe src="x" />\n      </div>\n    );\n  }\n  return (\n    <div className="h-full w-full">\n      <button type="button" />\n    </div>\n  );\n}`,
        filename: srcFile("features/home/hero-media/VideoHeroPlayer.tsx"),
        errors: [
          {
            message:
              'Smart component "VideoHeroPlayer" must expose exactly one stable data-testid="VideoHeroPlayer" anchor for itself in every rendered result. ' +
              "Place it on the existing DOM surface or on a child component that forwards data-testid instead of adding an artificial wrapper. " +
              "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
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

void describe("The smart component's `data-testid` MUST live on an existing meaningful DOM surface. If the component composes a portal or another non-DOM wrapper, pass `data-testid` to the child component that owns that DOM surface and make that child forward the prop; MUST NOT add an otherwise unnecessary DOM wrapper only to host `data-testid`.", () => {
  ruleTester.run("data-testid-case", dataTestIdCaseRule, {
    valid: [
      {
        code: `export async function AccountPanel() {\n  const open = await zodFetch({ url, responseSchema });\n  return <section data-testid="AccountPanel">{open ? <p /> : <p />}</section>;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
      {
        code: `export function CredentialFormDialog() {\n  const handleSuccess = () => save();\n  return (\n    <Dialog>\n      <DialogTrigger />\n      <DialogContent data-testid="CredentialFormDialog">\n        <CredentialForm onSuccess={handleSuccess} />\n      </DialogContent>\n    </Dialog>\n  );\n}`,
        filename: srcFile("features/credentials/CredentialFormDialog.tsx"),
      },
      {
        code: `export async function AccountPanel() {\n  const open = await zodFetch({ url, responseSchema });\n  return open ? <section data-testid="AccountPanel" /> : <aside data-testid="AccountPanel" />;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
      },
    ],
    invalid: [
      {
        code: `export function CredentialFormDialog() {\n  const handleSuccess = () => save();\n  return (\n    <Dialog>\n      <DialogTrigger />\n      <DialogContent>\n        <CredentialForm onSuccess={handleSuccess} />\n      </DialogContent>\n    </Dialog>\n  );\n}`,
        filename: srcFile("features/credentials/CredentialFormDialog.tsx"),
        errors: [
          {
            message:
              'Smart component "CredentialFormDialog" must expose exactly one stable data-testid="CredentialFormDialog" anchor for itself in every rendered result. ' +
              "Place it on the existing DOM surface or on a child component that forwards data-testid instead of adding an artificial wrapper. " +
              "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
          },
        ],
      },
      {
        code: `export async function AccountPanel() {\n  const open = await zodFetch({ url, responseSchema });\n  return open ? <section data-testid="AccountPanel" /> : <aside />;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message:
              'Smart component "AccountPanel" must expose exactly one stable data-testid="AccountPanel" anchor for itself in every rendered result. ' +
              "Place it on the existing DOM surface or on a child component that forwards data-testid instead of adding an artificial wrapper. " +
              "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
          },
        ],
      },
      {
        code: `export async function AccountPanel() {\n  const open = await zodFetch({ url, responseSchema });\n  return <><section data-testid="AccountPanel" /><aside data-testid="AccountPanel" /></>;\n}`,
        filename: srcFile("features/account/AccountPanel.tsx"),
        errors: [
          {
            message:
              'Smart component "AccountPanel" must expose exactly one stable data-testid="AccountPanel" anchor for itself in every rendered result. ' +
              "Place it on the existing DOM surface or on a child component that forwards data-testid instead of adding an artificial wrapper. " +
              "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md",
          },
        ],
      },
    ],
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
      {
        code: `export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {\n  return <html><body>{String(error.message)}<button onClick={reset}>retry</button></body></html>;\n}`,
        filename: srcFile("app/global-error.tsx"),
      },
      {
        code: `export default function NotFound() {\n  return <main data-testid="NotFound">Missing</main>;\n}`,
        filename: srcFile("app/not-found.tsx"),
      },
    ],
    invalid: [],
  });
});
