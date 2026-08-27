import { describe, ruleTester, srcFile } from "../rule-tester";
import { jsxHygieneRule } from "./jsx-hygiene";

void describe("Arithmetic, chained built-in method calls, calls to functions declared outside the component, nested ternaries, and conditions containing two or more logical operators MUST be extracted before return, including in JSX attributes.", () => {
  ruleTester.run("jsx-hygiene", jsxHygieneRule, {
    valid: [
      {
        code: "export function Card({ active, score, items, className, onSave }) { return <div className={cn('card', active && 'active', className)}>{active ? score : 0}{items.map((item) => item.id)}<button onClick={() => onSave()} /></div>; }",
        filename: srcFile("features/cards/card.tsx"),
      },
      {
        code: "export function Card({ first, second }) { return <div>{first && second}</div>; }",
        filename: srcFile("features/cards/card.tsx"),
      },
    ],
    invalid: [
      {
        code: "export function Card({ score }) { return <div>{score * 100}</div>; }",
        filename: srcFile("features/cards/card.tsx"),
        errors: [{ message: /Extract arithmetic from JSX/ }],
      },
      {
        code: "export function Card({ items }) { return <div>{items.filter(Boolean).map(renderItem)}</div>; }",
        filename: srcFile("features/cards/card.tsx"),
        errors: [{ message: /Extract chained built-in method calls from JSX/ }],
      },
      {
        code: "export function Card({ record }) { return <div>{formatDate(record.updatedAt)}</div>; }",
        filename: srcFile("features/cards/card.tsx"),
        errors: [{ message: /Extract calls to functions declared outside the component from JSX/ }],
      },
      {
        code: "export function Card({ loading, error }) { return <div>{loading ? <Spinner /> : error ? <Error /> : <Content />}</div>; }",
        filename: srcFile("features/cards/card.tsx"),
        errors: [{ message: /Extract nested ternaries from JSX/ }],
      },
      {
        code: "export function Card({ a, b, c }) { return <div>{a && b && c && <Admin />}</div>; }",
        filename: srcFile("features/cards/card.tsx"),
        errors: [{ message: /Extract conditions containing two or more logical operators from JSX/ }],
      },
      {
        code: "export function Card({ active }) { return <div aria-hidden={active && enabled && owner} />; }",
        filename: srcFile("features/cards/card.tsx"),
        errors: [{ message: /Extract conditions containing two or more logical operators from JSX/ }],
      },
    ],
  });
});
