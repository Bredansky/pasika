import { describe, ruleTester, srcFile } from "../rule-tester";
import { noMixedConcernsRule } from "./no-mixed-concerns";

void describe("A `.tsx` file that defines a component MUST NOT contain a second component.", () => {
  ruleTester.run("no-mixed-concerns", noMixedConcernsRule, {
    valid: [
      {
        code: "export function Menu() { return <nav />; }",
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        code: "export const Menu = () => <nav />;",
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        code: "export function Menu() { return <nav />; }\nexport type { MenuProps } from './types';",
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        code: "export function Menu() { return <nav />; }\nexport { type MenuProps } from './types';",
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        code: "export function Menu() { return <nav />; }\nexport interface MenuProps { title: string }",
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        code: 'export const metadata = { title: "Home" };\nexport default function RootLayout() { return <main />; }',
        filename: srcFile("app/layout.tsx"),
      },
      {
        code: 'export const viewport = { width: "device-width" };\nexport function Page() { return <main />; }\nexport function generateMetadata() { return { title: "Home" }; }',
        filename: srcFile("app/page.tsx"),
      },
      {
        code: "function Menu() { return <nav />; }\nexport { Menu };",
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        // CVA variant values and other helpers are not React components.
        code: 'const menuVariants = cva("flex");\nfunction Menu() { return <nav />; }\nexport { Menu, menuVariants };',
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        code: "export function Menu() { return <nav />; }\nexport function menuLabel() { return 'menu'; }",
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        code: 'export const metadata = { title: "Custom" };\nexport function Menu() { return <nav />; }',
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        code: 'export function Select() { return <div />; }\nexport { SelectTriggerSize } from "./constants";',
        filename: srcFile("features/credentials/select.tsx"),
      },
    ],
    invalid: [
      {
        code: "export function Menu() { return <nav><MenuItem /></nav>; }\nexport function MenuItem() { return <a />; }",
        filename: srcFile("features/nav/menu.tsx"),
        errors: 1,
      },
      {
        code: "export const Menu = () => <nav />;\nexport const MenuItem = () => <a />;",
        filename: srcFile("features/nav/menu.tsx"),
        errors: 1,
      },
      {
        code: "export function Menu() { return <nav><MenuItem /></nav>; }\nfunction MenuItem() { return <a />; }",
        filename: srcFile("features/nav/menu.tsx"),
        errors: 1,
      },
      {
        code: 'export function Dialog() { return <div />; }\nexport * from "./dialog-content";',
        filename: srcFile("shared/dialog.tsx"),
        errors: 1,
      },
      {
        code: "export const extra = true;\nexport function Page() { return <main />; }",
        filename: srcFile("app/page.tsx"),
        errors: 1,
      },
    ],
  });
});
