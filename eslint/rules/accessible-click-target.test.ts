import { describe, ruleTester, srcFile } from "../rule-tester";
import { accessibleClickTargetRule } from "./accessible-click-target";

const filename = srcFile("features/editor/preview-card.tsx");
const message =
  "A clickable non-interactive surface needs an interactive role, keyboard handler and focusability; prefer a native button or link.";

void describe("A clickable non-interactive JSX surface MUST support keyboard and focus interaction.", () => {
  ruleTester.run("accessible-click-target", accessibleClickTargetRule, {
    valid: [
      { filename, code: "export function SelectCard() { return <button onClick={select}>Select</button>; }" },
      { filename, code: "export function CardLink() { return <a href='/post' onClick={track}>Open</a>; }" },
      {
        filename,
        code: "export function SelectCard() { return <div role='button' tabIndex={0} onClick={select} onKeyDown={onKey}>Select</div>; }",
      },
      { filename, code: "export function SelectCard() { return <Card onClick={select}>Select</Card>; }" },
      {
        filename,
        code: "export function SelectCard() { return <Card role='button' tabIndex={0} onClick={select} onKeyDown={onKey}>Select</Card>; }",
      },
      {
        filename,
        code: "export function SelectCard() { return <div role={dynamicRole} onClick={select}>Select</div>; }",
      },
      {
        filename,
        code: "export function SelectCard() { return <Card onClick={select} role={dynamicRole}>Select</Card>; }",
      },
    ],
    invalid: [
      {
        filename,
        code: "export function SelectCard() { return <div onClick={select}>Select</div>; }",
        errors: [{ message }],
      },
      {
        filename,
        code: "export function SelectCard() { return <article onClick={select}>Select</article>; }",
        errors: [{ message }],
      },
      {
        filename,
        code: "export function SelectCard() { return <Card role='article' onClick={select}>Select</Card>; }",
        errors: [{ message }],
      },
      {
        filename,
        code: "export function SelectCard() { return <div role='button' tabIndex={0} onClick={select}>Select</div>; }",
        errors: [{ message }],
      },
      {
        filename,
        code: "export function SelectCard() { return <div role='button' onKeyDown={onKey} onClick={select}>Select</div>; }",
        errors: [{ message }],
      },
    ],
  });
});
