import { describe, ruleTester, srcFile } from "../rule-tester.js";
import { enforceCnMergeRule } from "./enforce-cn-merge.js";

const DOC = "See docs/styling-guide/rules/class-composition-rule.md";
const TEMPLATE_MESSAGE = `Use cn() instead of template literals with conditionals for className. ${DOC}`;
const PLUS_MESSAGE = `Use cn() instead of + operator for className. ${DOC}`;
const STATIC_MESSAGE = `Static className with more than 5 classes must use cn() with grouped string literals. ${DOC}`;
const GROUP_MESSAGE = `Each cn() string argument must contain at most 5 class names. Group by styling concern. ${DOC}`;

/** Assembled from parts so this file holds no literal template-expression sequence of its own. */
const INTERPOLATION_START = "$";
const CONDITIONAL_TEMPLATE_CLASS = `<button className={\`rounded px-3 ${INTERPOLATION_START}{active ? "primary-surface" : "muted-surface"}\`} />`;

void describe("Components MUST use cn or the project's equivalent class-merging helper for conditional classes and a className passed to the component.", () => {
  ruleTester.run("enforce-cn-merge", enforceCnMergeRule, {
    valid: [
      {
        code: '<article className={cn("card-surface rounded-lg p-4", className)} />',
        filename: srcFile("shared/card.tsx"),
      },
      {
        code: '<button className={cn("rounded px-3", active && "primary-surface")} />',
        filename: srcFile("shared/button.tsx"),
      },
    ],
    invalid: [
      {
        code: CONDITIONAL_TEMPLATE_CLASS,
        filename: srcFile("shared/button.tsx"),
        errors: [{ message: TEMPLATE_MESSAGE }],
      },
    ],
  });
});

void describe("Components MUST NOT concatenate class strings with template literals or + when any part is conditional.", () => {
  ruleTester.run("enforce-cn-merge", enforceCnMergeRule, {
    valid: [
      {
        code: '<button className={cn("rounded px-3", active ? "primary-surface" : "muted-surface")} />',
        filename: srcFile("shared/button.tsx"),
      },
    ],
    invalid: [
      {
        code: '<button className={"rounded px-3 " + (active ? "primary-surface" : "muted-surface")} />',
        filename: srcFile("shared/button.tsx"),
        errors: [{ message: PLUS_MESSAGE }],
      },
    ],
  });
});

void describe("A className passed to a component MUST contain only outer-layout utilities: margins, sizing, flex or grid item placement, and z-index.", () => {
  ruleTester.run("enforce-cn-merge", enforceCnMergeRule, {
    valid: [
      {
        code: '<Card className="w-full max-w-lg self-center mt-4" />',
        filename: srcFile("features/dashboard/card.tsx"),
      },
      {
        code: '<Card className={cn("w-full", className)} />',
        filename: srcFile("features/dashboard/card.tsx"),
      },
    ],
    invalid: [
      {
        code: '<Card className="rounded-lg bg-card px-4" />',
        filename: srcFile("features/dashboard/card.tsx"),
        errors: 1,
      },
    ],
  });
});

void describe("A component MUST expose its supported appearance and size variants through typed props, not through a passed className or separate class-name props for internal elements.", () => {
  ruleTester.run("enforce-cn-merge", enforceCnMergeRule, {
    valid: [
      {
        code: '<Card size="lg" tone="primary" />',
        filename: srcFile("features/dashboard/card.tsx"),
      },
    ],
    invalid: [
      {
        code: '<Card iconClassName="text-muted-foreground" />',
        filename: srcFile("features/dashboard/card.tsx"),
        errors: 1,
      },
    ],
  });
});

void describe("A static class list with more than five class names MUST use cn with multiple string literals, each grouped by styling concern and containing no more than five class names.", () => {
  ruleTester.run("enforce-cn-merge", enforceCnMergeRule, {
    valid: [
      {
        code: '<article className="rounded-lg border bg-card px-6 py-4" />',
        filename: srcFile("shared/card.tsx"),
      },
      {
        code: '<article className={cn("rounded-lg border border-border", "bg-card shadow-sm", "px-6 py-4")} />',
        filename: srcFile("shared/card.tsx"),
      },
    ],
    invalid: [
      {
        code: '<article className="rounded-lg border border-border bg-card px-6 py-4 shadow-sm transition-shadow" />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: STATIC_MESSAGE }],
      },
      {
        code: '<article className={cn("rounded-lg border border-border bg-card px-6 py-4 shadow-sm")} />',
        filename: srcFile("shared/card.tsx"),
        errors: [{ message: GROUP_MESSAGE }],
      },
    ],
  });
});
