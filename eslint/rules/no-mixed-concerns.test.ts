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
        // Type-only exports do not create another runtime entry point.
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
        code: "function Menu() { return <nav />; }\nexport { Menu };",
        filename: srcFile("features/nav/menu.tsx"),
      },
      {
        // A private helper that does not render JSX (lowercase) is not a component.
        code: "export function Menu() { return <nav>{label}</nav>; }\nfunction label() { return 'menu'; }",
        filename: srcFile("features/nav/menu.tsx"),
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
        // A private (non-exported) second component is still a second component.
        code: "export function Menu() { return <nav><MenuItem /></nav>; }\nfunction MenuItem() { return <a />; }",
        filename: srcFile("features/nav/menu.tsx"),
        errors: 1,
      },
      {
        // A component must not forward its sibling components as a barrel.
        code: 'export function Select() { return <div />; }\nexport { SelectTrigger } from "./select-trigger";\nexport { SelectItem } from "./select-item";',
        filename: srcFile("features/credentials/select.tsx"),
        errors: 2,
      },
      {
        code: 'export function Select() { return <div />; }\nexport { SelectTriggerSize } from "./constants";',
        filename: srcFile("features/credentials/select.tsx"),
        errors: 1,
      },
      {
        code: 'export function Dialog() { return <div />; }\nexport * from "./dialog-content";',
        filename: srcFile("shared/dialog.tsx"),
        errors: 1,
      },
      {
        code: "export function Menu() { return <nav />; }\nexport const menuId = 'menu';",
        filename: srcFile("features/nav/menu.tsx"),
        errors: 1,
      },
      {
        code: "function Menu() { return <nav />; }\nexport { Menu, menuId };",
        filename: srcFile("features/nav/menu.tsx"),
        errors: 1,
      },
    ],
  });
});
