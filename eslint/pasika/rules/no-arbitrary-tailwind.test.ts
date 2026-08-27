import { describe, ruleTester, srcFile } from "../rule-tester";
import { noArbitraryTailwindRule } from "./no-arbitrary-tailwind";

const message = (className: string): string =>
  `Tailwind arbitrary-value class "${className}" is not allowed. Use a named token or custom utility. ` +
  "See docs/styling-guide/rules/arbitrary-value-rule.md";

void describe("Components MUST NOT use arbitrary-value classes for project styling. They MUST use an existing Tailwind or project utility, or define a project token or custom utility first.", () => {
  ruleTester.run("no-arbitrary-tailwind", noArbitraryTailwindRule, {
    valid: [
      { code: '<button className="rounded-md">Save</button>', filename: srcFile("shared/save-button.tsx") },
      { code: '<div className="primary-surface px-6 py-4" />', filename: srcFile("shared/card.tsx") },
      {
        // A bracket in a variant prefix is a breakpoint, not an arbitrary value.
        code: '<div className="min-[400px]:flex-row" />',
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
    ],
  });
});
