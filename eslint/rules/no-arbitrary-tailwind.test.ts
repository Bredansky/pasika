import { describe, ruleTester, srcFile } from "../rule-tester";
import { noArbitraryTailwindRule } from "./no-arbitrary-tailwind";

const message = (className: string): string =>
  `Tailwind raw-value class "${className}" is not allowed. Define and use a named utility instead. ` +
  "See docs/next-tailwind-guide/rules/arbitrary-value-rule.md";

void describe("Components MUST NOT use arbitrary-value classes, arbitrary-property classes, or custom-property shorthand for project styling. They MUST use a named utility that maps the value instead.", () => {
  ruleTester.run("no-arbitrary-tailwind", noArbitraryTailwindRule, {
    valid: [
      { code: '<button className="rounded-md">Save</button>', filename: srcFile("shared/save-button.tsx") },
      { code: '<div className="primary-surface px-6 py-4" />', filename: srcFile("shared/card.tsx") },
      {
        // A bracket in a variant prefix is a breakpoint, not an arbitrary value.
        code: '<div className="min-[400px]:flex-row [&>*]:p-2" />',
        filename: srcFile("shared/card.tsx"),
      },
    ],
    invalid: [
      {
        code: '<button className="rounded-[13px]">Save</button>',
        filename: srcFile("shared/save-button.tsx"),
        errors: [{ message: message("rounded-[13px]") }],
      },
      {
        code: '<span className="text-[#fff]" />',
        filename: srcFile("shared/label.tsx"),
        errors: [{ message: message("text-[#fff]") }],
      },
      {
        code: 'cn("rounded-md", isActive && "bg-[--brand]")',
        filename: srcFile("shared/card.tsx"),
        errors: 1,
      },
      {
        code: '<img className="max-h-(--media-preview-max-height) object-contain" />',
        filename: srcFile("features/editor/media-item.tsx"),
        errors: [{ message: message("max-h-(--media-preview-max-height)") }],
      },
      {
        code: 'cn("rounded-md", isActive && "bg-(--brand-canvas)")',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-(--brand-canvas)") }],
      },
      {
        code: '<div className="hover:bg-[#fff] data-[state=open]:text-(--active-ink)" />',
        filename: srcFile("shared/card.tsx"),
        errors: 1,
      },
      {
        code: '<div className="[grid-template-columns:1fr_2fr]" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("[grid-template-columns:1fr_2fr]") }],
      },
    ],
  });
});
