/**
 * ESLint rule: pasika/locales-location
 *
 * All locales MUST live in the named locales object exported from
 * src/locales/index.ts. User-facing strings defined outside the locales
 * directory are reported.
 *
 * @see docs/next-codebase-guide/rules/locales-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";

function isLocalesFile(filename: string): boolean {
  const segments = path.resolve(filename).split(path.sep);
  const srcIdx = segments.lastIndexOf("src");
  return srcIdx !== -1 && segments[srcIdx + 1] === "locales";
}

/** Test and spec files hold fixture data, not text a component renders. */
function isTestFile(filename: string): boolean {
  return /\.(?:test|spec)\.[cm]?tsx?$/.test(filename);
}

const LOCALE_NAME_RE = /^[a-z][a-zA-Z0-9]*$/;

function looksLikeLocaleKey(name: string): boolean {
  return LOCALE_NAME_RE.test(name);
}

/**
 * Distinguishes prose meant for display (capitalized, like "Welcome" or a
 * translated sentence) from lowercase data tokens (enum values, CSS classes,
 * MIME types, IDs) that just happen to sit in a camelCase-named object.
 * `\p{Lu}` matches an uppercase letter in any script, not only ASCII.
 */
function looksLikeUserFacingString(value: unknown): boolean {
  return typeof value === "string" && /^\p{Lu}/u.test(value);
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
    if (isLocalesFile(context.filename) || isTestFile(context.filename)) return {};

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
          const hasUserFacingStringValues = node.init.properties.some(
            (p) => p.type === "Property" && p.value.type === "Literal" && looksLikeUserFacingString(p.value.value),
          );
          if (hasUserFacingStringValues) {
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
