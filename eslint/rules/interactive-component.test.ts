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
      {
        // The interactive element is the component's whole purpose: the button
        // is the sole meaningful child of a decorative wrapper.
        code: `export function VideoHeroPlayer({ onPlay }: { onPlay: () => void }) {\n  return (\n    <div className="h-full w-full">\n      <button type="button" onClick={onPlay} aria-label="Play video">\n        <Play className="h-16 w-16" />\n      </button>\n    </div>\n  );\n}`,
        filename: srcFile("features/home/hero-media/VideoHeroPlayer.tsx"),
      },
      {
        // A clickable card whose whole surface is the anchor (a conditional
        // branch of the return) is the component's purpose, not mixed content.
        code: `export function ContactMethodCard({ href, name }: { href?: string; name: string }) {\n  const content = <div><h2>{name}</h2><p>Description</p></div>;\n  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{content}</a> : <div>{content}</div>;\n}`,
        filename: srcFile("features/contact/contact-method-card.tsx"),
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
      {
        // A wrapper carrying real text content alongside the interactive
        // element is still a violation.
        code: "export function ErrorFallback() { return <div><h2>Error</h2><p>Message</p><button type=\"button\" onClick={reset}>Retry</button></div>; }",
        filename: srcFile("shared/error-fallback.tsx"),
        errors: 1,
      },
    ],
  });
});
