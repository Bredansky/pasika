import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester } from "../rule-tester";
import { componentCasingRule } from "./component-casing";

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-component-casing-")));
process.chdir(root);

const file = (relativePath: string): string => path.join(root, "src", relativePath);

const DOC = "See docs/next-codebase-guide/rules/smart-vs-dumb-component-rule.md";

void describe("A component's name MUST be `PascalCase`.", () => {
  ruleTester.run("component-casing", componentCasingRule, {
    valid: [
      // PascalCase function component.
      {
        code: "export function PlatformCard() { return <article />; }",
        filename: file("features/social/PlatformCard.tsx"),
      },
      // PascalCase const component.
      {
        code: "export const PlatformCard = () => { return <article />; };",
        filename: file("features/social/PlatformCard.tsx"),
      },
      // A custom hook is a different naming domain, even if it happens to return JSX.
      {
        code: "export function useWidget() { return <div />; }",
        filename: file("features/social/hooks/use-widget.tsx"),
      },
      // Non-JSX-returning constants are out of this rule's scope.
      { code: "export const platformCard = 1;", filename: file("features/social/PlatformCard.tsx") },
      // This rule only applies to .tsx files.
      { code: "export function platform_card() { return null; }", filename: file("utils/platform-card.ts") },
    ],
    invalid: [
      {
        code: "export function platformCard() { return <article />; }",
        filename: file("features/social/platform-card.tsx"),
        errors: [
          { message: `platformCard must be PascalCase; only a PascalCase name resolves as a JSX component. ${DOC}` },
        ],
      },
      {
        code: "export const platform_card = () => { return <article />; };",
        filename: file("features/social/platform-card.tsx"),
        errors: [
          { message: `platform_card must be PascalCase; only a PascalCase name resolves as a JSX component. ${DOC}` },
        ],
      },
    ],
  });
});
