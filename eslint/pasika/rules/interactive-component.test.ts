import { describe, ruleTester, srcFile } from "../rule-tester.js";
import { interactiveComponentRule } from "./interactive-component.js";

void describe("An interactive HTML element MUST be extracted to a component with a descriptive name.", () => {
  ruleTester.run("interactive-component", interactiveComponentRule, {
    valid: [
      {
        code: "export function MenuButton({ onClick }) { return <button onClick={onClick}>Open</button>; }",
        filename: srcFile("features/navigation/menu-button.tsx"),
      },
      {
        code: "export function Header() { return <header><MenuButton /><SearchField /></header>; }",
        filename: srcFile("features/navigation/header.tsx"),
      },
      {
        code: "export function Empty() { return <div><span>Only text</span></div>; }",
        filename: srcFile("features/navigation/empty.tsx"),
      },
    ],
    invalid: [
      {
        code: "export function Header({ onMenuClick }) { return <header><h1>Dashboard</h1><button onClick={onMenuClick}>Menu</button></header>; }",
        filename: srcFile("features/navigation/header.tsx"),
        errors: 1,
      },
      {
        code: 'export function SearchPanel({ value }) { return <section><label htmlFor="search">Search</label><input id="search" value={value} /></section>; }',
        filename: srcFile("features/navigation/search-panel.tsx"),
        errors: 2,
      },
    ],
  });
});
