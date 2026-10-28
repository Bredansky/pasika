/**
 * ESLint rule: pasika/global-stylesheet
 *
 * The canonical global stylesheet must register Tailwind. Imported partials
 * share that registration and must not each import Tailwind themselves.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { CSS_EXTENSIONS, findFiles } from "./source-files";

const MISSING_REGISTRATION = 'Global stylesheet must register Tailwind with @import "tailwindcss".';
const MISSING_ENTRYPOINT = "Project CSS must have a canonical global stylesheet at src/app/styles/globals.css.";

export const globalStylesheetRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    fixable: "code",
    docs: {
      description: "Require the canonical global CSS entry point to register Tailwind, not every imported partial.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const entryPoint = path.normalize(path.join(sourceRoot, "app", "styles", "globals.css"));
    const current = path.normalize(path.resolve(context.filename));
    const isEntryPoint = current === entryPoint;

    // When globals.css does not exist, report once on the first stylesheet
    // instead of silently accepting a tree consisting only of CSS partials.
    const hasEntryPoint = existsSync(entryPoint);
    const isFirstStylesheet =
      !hasEntryPoint &&
      [current, ...findFiles(sourceRoot, CSS_EXTENSIONS).map((file) => path.normalize(file))].sort()[0] === current;
    if (!isEntryPoint && !isFirstStylesheet) return {};

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        if (!isEntryPoint) {
          context.report({ node, message: MISSING_ENTRYPOINT });
          return;
        }

        const registersTailwind = node.children.some(
          (child) =>
            child.type === "Atrule" && child.name === "import" && JSON.stringify(child.prelude).includes("tailwindcss"),
        );
        if (!registersTailwind) {
          context.report({
            node,
            message: MISSING_REGISTRATION,
            fix(fixer) {
              // One canonical entry owns Tailwind; this fix only edits the
              // current CSS file and never creates/moves sibling files.
              return fixer.insertTextBeforeRange([0, 0], '@import "tailwindcss";\n');
            },
          });
        }
      },
    };
  },
};
