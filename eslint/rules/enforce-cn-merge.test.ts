import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, ruleTester, srcFile } from "../rule-tester";
import { enforceCnMergeRule } from "./enforce-cn-merge";

/**
 * The package-component exemption resolves imports through the project index,
 * so it needs a real tree on disk: one file imports an icon from a package, one
 * imports a project component from a local module.
 */
const FIXTURE: Record<string, string> = {
  // A project component: its consumers must pass only outer-layout classes.
  "shared/card.tsx": 'export function Card() { return <div />; }\n',
  // A consumer that imports both a package icon and the project component.
  "features/player/player.tsx":
    'import { Play } from "lucide-react";\nimport { Card } from "../../shared/card";\n' +
    'export function Player() { return <><Play className="text-primary h-4 w-4" /><Card className="w-full" /></>; }\n',
};

const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-enforce-cn-")));
for (const [relativePath, contents] of Object.entries(FIXTURE)) {
  const filePath = path.join(root, "src", relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}
process.chdir(root);

const pkgFile = (): string => path.join(root, "src", "features/player/player.tsx");

const DOC = "See docs/styling-guide/rules/class-composition-rule.md";
const TEMPLATE_MESSAGE = `Use cn() instead of template literals with conditionals for className. ${DOC}`;
const PLUS_MESSAGE = `Use cn() instead of + operator for className. ${DOC}`;
const STATIC_MESSAGE = `Static className with more than 5 classes must use cn() with grouped string literals. ${DOC}`;
const GROUP_MESSAGE = `Each cn() string argument must contain at most 5 class names. Group by styling concern. ${DOC}`;
const CONDITIONAL_MESSAGE = `Use cn() for conditional classes in className. ${DOC}`;

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
      {
        code: '<button className={active && "primary-surface"} />',
        filename: srcFile("shared/button.tsx"),
        errors: [{ message: CONDITIONAL_MESSAGE }],
      },
      {
        code: '<button className={active ? "primary-surface" : "muted-surface"} />',
        filename: srcFile("shared/button.tsx"),
        errors: [{ message: CONDITIONAL_MESSAGE }],
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
      // A package component (lucide icon) is styled exclusively through className.
      {
        code: FIXTURE["features/player/player.tsx"] ?? "",
        filename: pkgFile(),
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

void describe("A className passed to a component imported from a package (an icon, next/link, next/image) MAY contain any utility: package components expose no typed variant props, so their className is their only styling API.", () => {
  ruleTester.run("enforce-cn-merge", enforceCnMergeRule, {
    valid: [
      // The package icon's non-layout className is its styling API.
      {
        code: FIXTURE["features/player/player.tsx"] ?? "",
        filename: pkgFile(),
      },
    ],
    invalid: [],
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
