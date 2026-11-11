import { describe, ruleTester, srcFile } from "../rule-tester";
import { noArbitraryTailwindRule } from "./no-arbitrary-tailwind";

const message = (className: string): string =>
  `Tailwind raw-value class "${className}" is not allowed. Define and use a named utility instead. ` +
  "See docs/next-tailwind-guide/rules/arbitrary-value-rule.md";

void describe("Components MUST NOT use Tailwind arbitrary values, arbitrary properties, or custom property (CSS variable) syntax for project styling. They MUST use a named utility that maps the value instead.", () => {
  ruleTester.run("no-arbitrary-tailwind", noArbitraryTailwindRule, {
    valid: [
      { code: '<button className="rounded-md">Save</button>', filename: srcFile("shared/save-button.tsx") },
      { code: '<div className="primary-surface px-6 py-4" />', filename: srcFile("shared/card.tsx") },
      {
        // A bracket in a variant prefix is a breakpoint, not an arbitrary value.
        code: '<div className="min-[400px]:flex-row [&>*]:p-2" />',
        filename: srcFile("shared/card.tsx"),
      },
      { code: '<div className="  rounded-md" />', filename: srcFile("shared/card.tsx") },
      { code: '<div id="w-[3px]" />', filename: srcFile("shared/card.tsx") },
      { code: "<div className />", filename: srcFile("shared/card.tsx") },
      { code: 'styles.cn("w-[3px]")', filename: srcFile("shared/card.tsx") },
      { code: 'renderEditor({ "style": "w-[3px]" })', filename: srcFile("shared/card.tsx") },
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
        errors: [{ message: message("bg-[#fff]") }, { message: message("text-(--active-ink)") }],
      },
      {
        code: '<p className="text-(color:--tweet-card-ink) text-(length:--tweet-card-name-text-size)" />',
        filename: srcFile("shared/tweet-card.tsx"),
        errors: [
          { message: message("text-(color:--tweet-card-ink)") },
          { message: message("text-(length:--tweet-card-name-text-size)") },
        ],
      },
      {
        code: '<div className="bg-cyan-400/(--brand-alpha) bg-pink-500/[71.37%]" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("bg-cyan-400/(--brand-alpha)") }, { message: message("bg-pink-500/[71.37%]") }],
      },
      {
        code: `cva("transition-[color,box-shadow]", {
          variants: {
            tone: {
              primary: "bg-(--primary-canvas)",
              danger: "text-(color:--danger-ink)",
            },
          },
        })`,
        filename: srcFile("shared/button.tsx"),
        errors: [
          { message: message("transition-[color,box-shadow]") },
          { message: message("bg-(--primary-canvas)") },
          { message: message("text-(color:--danger-ink)") },
        ],
      },
      {
        code: `cn(
          0,
          \`rounded-[13px]\`,
          isActive && "bg-(--brand-canvas)",
          isActive ? "text-(color:--brand-ink)" : "w-[3px]",
          [, "h-[4px]"],
          { "m-[5px]": isActive },
        )`,
        filename: srcFile("shared/card.tsx"),
        errors: 6,
      },
      {
        code: `cva(
          [, "p-[1px]", active && "m-[2px]", active ? "w-[3px]" : "h-[4px]"],
          {
            variants: { tone: { primary: "bg-(--primary-canvas)" } },
            compoundVariants: [{ tone: "primary", className: "text-(color:--ink)" }],
            ...sharedVariants,
          },
        )`,
        filename: srcFile("shared/button.tsx"),
        errors: 6,
      },
      {
        code: 'renderEditor({ className: "min-h-[200px]" })',
        filename: srcFile("features/editor/editor-container.tsx"),
        errors: [{ message: message("min-h-[200px]") }],
      },
      {
        code: 'renderEditor({ "class": "min-h-[201px]" })',
        filename: srcFile("features/editor/editor-container.tsx"),
        errors: [{ message: message("min-h-[201px]") }],
      },
      {
        code: 'const { className = "min-h-[200px]" } = options;',
        filename: srcFile("features/editor/rich-editor.tsx"),
        errors: [{ message: message("min-h-[200px]") }],
      },
      {
        code: '<div className="[grid-template-columns:1fr_2fr]" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: message("[grid-template-columns:1fr_2fr]") }],
      },
    ],
  });
});

void describe("Components MUST NOT use numeric fractional Tailwind utility classes such as h-3.5 or w-3.5; they MUST use an integer utility or a named @utility that maps an explicit value.", () => {
  const fractionalMessage = (className: string): string =>
    `Fractional Tailwind class "${className}" is not allowed. ` +
    "Use an integer scale value or a named @utility for the exact value. " +
    "See docs/next-tailwind-guide/rules/arbitrary-value-rule.md";

  ruleTester.run("no-arbitrary-tailwind-fractional", noArbitraryTailwindRule, {
    valid: [
      { code: '<div className="h-3 w-4 gap-2" />', filename: srcFile("shared/card.tsx") },
      { code: '<div className="size-14px" />', filename: srcFile("shared/card.tsx") },
      { code: 'cn("h-4", active && "gap-x-2")', filename: srcFile("shared/card.tsx") },
      {
        code: 'cva("h-4", { variants: { size: { small: "size-3", large: "size-8" } } })',
        filename: srcFile("shared/button.tsx"),
      },
      { code: '<div className="data-[state=open]:h-3" />', filename: srcFile("shared/card.tsx") },
    ],
    invalid: [
      {
        code: '<div className="h-3.5 w-3.5" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: fractionalMessage("h-3.5") }, { message: fractionalMessage("w-3.5") }],
      },
      {
        code: '<div className="hover:-mt-1.5 sm:gap-x-0.5" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: fractionalMessage("-mt-1.5") }, { message: fractionalMessage("gap-x-0.5") }],
      },
      {
        code: 'cn("size-2.5", enabled ? "opacity-0.5" : "w-3")',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: fractionalMessage("size-2.5") }, { message: fractionalMessage("opacity-0.5") }],
      },
      {
        code: 'cva("h-3.5", { variants: { size: { small: "w-2.5", large: "w-4" } } })',
        filename: srcFile("shared/button.tsx"),
        errors: [{ message: fractionalMessage("h-3.5") }, { message: fractionalMessage("w-2.5") }],
      },
      {
        code: '<div className="focus:translate-x-1.5/2" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: fractionalMessage("translate-x-1.5/2") }],
      },
    ],
  });
});
