import { describe, ruleTester, srcFile } from "../rule-tester";
import { interactiveComponentRule } from "./interactive-component";

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
      {
        // A decorative element that only looks interactive (no handler) is not
        // a component boundary.
        code: "export function Showcase() { return <section><h1>Buttons</h1><button type='button' className='primary-surface'>Primary</button></section>; }",
        filename: srcFile("features/showcase/showcase.tsx"),
      },
      {
        // Next.js framework files (error boundary, metadata) are exempt.
        code: `export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {\n  return <html><body><p>{String(error.message)}</p><button type="button" onClick={reset}>retry</button></body></html>;\n}`,
        filename: srcFile("app/global-error.tsx"),
      },
    ],
    invalid: [
      {
        code: "export function Header({ onMenuClick }) { return <header><h1>Dashboard</h1><button onClick={onMenuClick}>Menu</button></header>; }",
        filename: srcFile("features/navigation/header.tsx"),
        errors: 1,
      },
      {
        code: 'export function SearchPanel({ value, onChange }) { return <section><label htmlFor="search">Search</label><input id="search" value={value} onChange={onChange} /></section>; }',
        filename: srcFile("features/navigation/search-panel.tsx"),
        errors: 2,
      },
      {
        // An interactive element mixed with static content in a non-framework
        // file is still a violation.
        code: "export function ContactCard() { return <section><h2>Contact</h2><a href=\"/about\">About</a></section>; }",
        filename: srcFile("features/contact/contact-card.tsx"),
        errors: 1,
      },
    ],
  });
});
