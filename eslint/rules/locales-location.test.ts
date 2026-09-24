import { describe, ruleTester } from "../rule-tester";
import { localesLocationRule } from "./locales-location";

void describe("All locales MUST live in the named locales object exported from src/locales/index.ts.", () => {
  ruleTester.run("locales-location", localesLocationRule, {
    valid: [
      {
        code: 'export const locales = { stream: { watchLiveStream: "Watch Live" } };',
        filename: "/project/src/locales/index.ts",
      },
      {
        code: 'const disabled = loading ? "opacity-50" : "opacity-100";',
        filename: "/project/src/features/stream/component.tsx",
      },
      {
        code: 'const page = { title: "Home" };',
        filename: "/project/src/app/page.tsx",
      },
      {
        code: "export function Divider() { return <span>—</span>; }",
        filename: "/project/src/shared/divider.tsx",
      },
      {
        code: 'export const config = { apiUrl: "https://api.example.com" };',
        filename: "/project/src/config/api/index.ts",
      },
      // Lowercase enum-token values are data, not display prose.
      {
        code: 'export const defaultPreferences = { format: "post_45", variant: "carousel" };',
        filename: "/project/src/constants/index.ts",
      },
      // Numeric/boolean values are never display prose.
      {
        code: "export const thresholds = { near: 14, snap: 8 };",
        filename: "/project/src/features/canvas/thresholds.ts",
      },
      // Space-separated CSS class strings are data, not prose, despite the space.
      {
        code: 'export const textStyles = { classic: "leading-none font-semibold text-white" };',
        filename: "/project/src/features/editor/text-styles.ts",
      },
      // MIME-type and ID-like lowercase values are data, not prose.
      {
        code: 'export const extensionByContentType = { "image/jpeg": "jpg" };',
        filename: "/project/src/utils/storage.ts",
      },
      // Test fixtures hold arbitrary data, not text a component renders.
      {
        code: 'const baseLayer = { content: "Hello World" };',
        filename: "/project/src/features/editor/layers-utils.test.ts",
      },
      // Styling/data props can contain strings without becoming display text.
      {
        code: 'export function Button({ active }) { return <button className={active ? "block" : "hidden"} data-testid="delete-button" />; }',
        filename: "/project/src/shared/button.tsx",
      },
      // Non-toast APIs are not assumed to display their string arguments.
      {
        code: 'logger.error("Failed to connect");',
        filename: "/project/src/features/home/logger.ts",
      },
      // Dynamic toast content already comes from runtime data.
      {
        code: "toast.error(error.message);",
        filename: "/project/src/features/home/actions.ts",
      },
      {
        code: "let validationLabel;",
        filename: "/project/src/features/credentials/CredentialCard.tsx",
      },
      {
        code: "export function DynamicName({ name }) { return <input placeholder={name} />; }",
        filename: "/project/src/features/credentials/CredentialCard.tsx",
      },
      {
        code: "export function Count({ count }) { return <span>{count - 1}</span>; }",
        filename: "/project/src/features/credentials/CredentialCard.tsx",
      },
      {
        code: "setOptions({ ...base });",
        filename: "/project/src/features/credentials/CredentialCard.tsx",
      },
      {
        code: "export function Toggle() { return <button aria-label />; }",
        filename: "/project/src/features/credentials/CredentialCard.tsx",
      },
      {
        code: 'export function OutsideSrc() { return <span className="block" />; }',
        filename: "/project/component.tsx",
      },
    ],
    invalid: [
      {
        code: 'export function Settings() { return <p className="text-muted-ink">Manage your social media platforms and AI tools credentials</p>; }',
        filename: "/project/src/features/settings/settings.tsx",
        errors: [
          {
            message: "User-facing JSX text must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: "export default function Page() { return <h1>Settings</h1>; }",
        filename: "/project/src/app/page.tsx",
        errors: [
          {
            message: "User-facing JSX text must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: 'const messages = { title: "Welcome", description: "Hello" };',
        filename: "/project/src/features/home/home-page.tsx",
        errors: [
          {
            message: "User-facing strings must live in src/locales/, not inline in component files.",
          },
        ],
      },
      // Uppercase-first-letter prose is flagged even for non-Latin scripts.
      {
        code: 'const messages = { greeting: "Привіт" };',
        filename: "/project/src/features/home/home-page.tsx",
        errors: [
          {
            message: "User-facing strings must live in src/locales/, not inline in component files.",
          },
        ],
      },
      {
        code: 'export function CredentialName() { return <input placeholder="Account name" />; }',
        filename: "/project/src/features/credentials/CredentialCard.tsx",
        errors: [
          {
            message: "User-facing JSX attribute text must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: 'export function Status({ active }) { return <span>{active ? "Active" : "Inactive"}</span>; }',
        filename: "/project/src/features/credentials/CredentialCard.tsx",
        errors: [
          {
            message: "User-facing JSX expression text must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: 'export function ErrorMessage({ error }) { return <span>{error && "Try again"}</span>; }',
        filename: "/project/src/features/credentials/CredentialCard.tsx",
        errors: [
          {
            message: "User-facing JSX expression text must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: 'export function Greeting({ name }) { return <span>{"Hello " + name}</span>; }',
        filename: "/project/src/features/credentials/CredentialCard.tsx",
        errors: [
          {
            message: "User-facing JSX expression text must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: "export function CredentialName() { return <input placeholder={`Account name`} />; }",
        filename: "/project/src/features/credentials/CredentialCard.tsx",
        errors: [
          {
            message: "User-facing JSX attribute text must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: 'setConfirmation({ title: "Delete Credential", description: "Are you sure you want to delete this credential?", confirmText: "Delete" });',
        filename: "/project/src/features/credentials/CredentialCard.tsx",
        errors: [
          {
            message: "User-facing object properties must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: 'setConfirmation({ "title": "Delete Credential" });',
        filename: "/project/src/features/credentials/CredentialCard.tsx",
        errors: [
          {
            message: "User-facing object properties must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: 'let validationLabel = "Not validated"; validationLabel = "Valid";',
        filename: "/project/src/features/credentials/CredentialCard.tsx",
        errors: [
          {
            message: "User-facing variable text must come from src/locales/index.ts, not be written inline.",
          },
          {
            message: "User-facing variable text must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
      {
        code: 'toast.success("Account name updated successfully"); toast.error("Failed to update account name");',
        filename: "/project/src/features/credentials/CredentialCard.tsx",
        errors: [
          {
            message: "User-facing toast text must come from src/locales/index.ts, not be written inline.",
          },
          {
            message: "User-facing toast text must come from src/locales/index.ts, not be written inline.",
          },
        ],
      },
    ],
  });
});
