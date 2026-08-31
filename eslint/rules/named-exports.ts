/**
 * ESLint rule: pasika/named-exports
 *
 * Enforces named exports for application files while allowing framework routing
 * files such as Next.js page.tsx and layout.tsx to use their required default
 * export contract.
 *
 * @see docs/code-organization-guide/rules/exports-and-imports-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";

const FRAMEWORK_DEFAULT_EXPORT_FILES = new Set([
  // App Router routing files
  "default",
  "error",
  "global-error",
  "layout",
  "loading",
  "not-found",
  "page",
  "route",
  "template",
  // File conventions (metadata, icons) that must default-export their handler
  "apple-icon",
  "icon",
  "manifest",
  "opengraph-image",
  "robots",
  "sitemap",
  "twitter-image",
]);

function isFrameworkDefaultExportFile(filename: string): boolean {
  const normalized = filename.replaceAll(path.sep, "/");
  if (!normalized.includes("/src/app/")) return false;
  const basename = path.basename(filename, path.extname(filename));
  return FRAMEWORK_DEFAULT_EXPORT_FILES.has(basename);
}

export const namedExportsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require named exports except where a framework requires a default export.",
    },
  },
  create(context) {
    if (isFrameworkDefaultExportFile(context.filename)) return {};

    return {
      ExportDefaultDeclaration(node) {
        context.report({
          node,
          message:
            "Files that export values must use named exports unless a framework or third-party package requires a different export style for that file. " +
            "See docs/code-organization-guide/rules/exports-and-imports-rule.md",
        });
      },
    };
  },
};
