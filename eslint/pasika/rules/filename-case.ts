/**
 * ESLint rule: pasika/filename-case
 *
 * Enforces the naming conventions from the "Smart vs Dumb Component Rule":
 *  - Smart components: PascalCase.tsx
 *  - Dumb components: kebab-case.tsx
 *  - Non-component files: kebab-case
 *
 * @see docs/code-organization-guide/rules/smart-vs-dumb-component-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { parseComponentInfo } from "./component-conventions.js";

/**
 * Next.js App Router routing files that are exempt from filename-case checks.
 * https://nextjs.org/docs/app/getting-started/project-structure#routing-files
 */
const NEXT_ROUTING_FILES = new Set([
  "page",
  "layout",
  "loading",
  "error",
  "not-found",
  "route",
  "template",
  "default",
  "middleware",
  "instrumentation",
]);

/** Suffixes that form a compound extension with the real extension (e.g. .example.tsx, .test.ts). */
const COMPOUND_SUFFIXES = new Set(["example", "test", "spec", "stories"]);

/**
 * Checks whether a string is in kebab-case.
 * Allows lowercase letters, digits, and hyphens (but not leading/trailing/double hyphens).
 */
function isKebabCase(str: string): boolean {
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(str);
}

/**
 * Checks whether a string is in PascalCase.
 * Starts with an uppercase letter, followed by alphanumeric characters.
 */
function isPascalCase(str: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(str);
}

export const filenameCaseRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce pasika filename conventions: kebab-case by default, PascalCase for smart .tsx components.",
    },
  },
  create(context) {
    const filename = context.filename;

    if (!filename) {
      return {};
    }

    // Only check files under src/
    const normalized = filename.replace(/\\/g, "/");
    if (!normalized.includes("/src/")) {
      return {};
    }

    const ext = path.extname(filename);
    let base = path.basename(filename, ext);

    // Strip compound suffix (e.g. ".example", ".test", ".stories", ".spec") to get the real base name
    const baseExt = path.extname(base);
    if (baseExt && COMPOUND_SUFFIXES.has(baseExt.slice(1))) {
      base = path.basename(base, baseExt);
    }

    // Next.js routing files are exempt
    if (NEXT_ROUTING_FILES.has(base)) {
      return {};
    }

    // .tsx components use PascalCase when smart and kebab-case when dumb.
    if (ext === ".tsx") {
      return {
        Program(node) {
          const components = parseComponentInfo(context.sourceCode.text, filename);
          const component = components[0];
          if (component?.smart && !isPascalCase(base)) {
            context.report({
              node,
              message: `Smart component files must use PascalCase.tsx. Filename "${path.basename(filename)}" is not PascalCase.`,
            });
            return;
          }
          if (component && !component.smart && !isKebabCase(base)) {
            context.report({
              node,
              message: `Dumb component files must use kebab-case.tsx. Filename "${path.basename(filename)}" is not kebab-case.`,
            });
            return;
          }
          if (!component && !(isPascalCase(base) || isKebabCase(base))) {
            context.report({
              node,
              message: `Filename "${path.basename(filename)}" does not match pasika conventions. Component files must be PascalCase.tsx (smart) or kebab-case.tsx (dumb).`,
            });
          }
        },
      };
    }

    // Everything else must be kebab-case
    if (!isKebabCase(base)) {
      return report(context, filename, ext);
    }

    return {};
  },
};

function report(context: Rule.RuleContext, filename: string, ext: string): Rule.NodeListener {
  return {
    Program(node) {
      const convention =
        ext === ".tsx"
          ? "Component files must be PascalCase.tsx (smart) or kebab-case.tsx (dumb)."
          : "Non-component files must use kebab-case.";
      context.report({
        node,
        loc: { line: 1, column: 0 },
        message: `Filename "${path.basename(filename)}" does not match pasika conventions. ${convention}`,
      });
    },
  };
}
