/**
 * ESLint rule: pasika/locales-location
 *
 * All locales MUST live in the named locales object exported from
 * src/locales/index.ts. User-facing strings defined outside the locales
 * directory are reported.
 *
 * @see docs/code-organization-guide/rules/locales-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";

function isLocalesFile(filename: string): boolean {
  const segments = path.resolve(filename).split(path.sep);
  const srcIdx = segments.lastIndexOf("src");
  return srcIdx !== -1 && segments[srcIdx + 1] === "locales";
}

const LOCALE_NAME_RE = /^[a-z][a-zA-Z0-9]*$/;

function looksLikeLocaleKey(name: string): boolean {
  return LOCALE_NAME_RE.test(name);
}

export const localesLocationRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require all locales to live in the named locales object.",
    },
  },
  create(context) {
    if (isLocalesFile(context.filename)) return {};

    const filename = context.filename;
    const segments = path.resolve(filename).split(path.sep);
    const srcIdx = segments.lastIndexOf("src");
    if (srcIdx === -1) return {};

    const folder = segments[srcIdx + 1];
    if (folder === "app" || folder === "config") return {};

    return {
      VariableDeclarator(node) {
        if (
          node.id.type === "Identifier" &&
          node.init?.type === "ObjectExpression" &&
          node.init.properties.length > 0 &&
          looksLikeLocaleKey(node.id.name)
        ) {
          const hasStringValues = node.init.properties.some((p) => p.type === "Property" && p.value.type === "Literal");
          if (hasStringValues) {
            context.report({
              node,
              message: "User-facing strings must live in src/locales/, not inline in component files.",
            });
          }
        }
      },
    };
  },
};
