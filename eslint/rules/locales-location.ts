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
import type * as ESTree from "estree";

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

/** JSX child text is display text when it contains at least one letter. */
function looksLikeUserFacingJsxText(value: unknown): boolean {
  return typeof value === "string" && /\p{L}/u.test(value);
}

type JsxTextNode = Rule.Node & { value?: unknown };

interface JsxExpressionContainer {
  type: "JSXExpressionContainer";
  expression: ESTree.Expression;
}

type JsxAttributeNode = Rule.Node & {
  name?: { name?: unknown };
  value?: ESTree.Literal | JsxExpressionContainer | null;
};

type JsxExpressionContainerNode = Rule.Node & {
  expression?: ESTree.Expression;
};

const USER_FACING_PROPERTY_NAMES = new Set([
  "alt",
  "aria-label",
  "cancelText",
  "children",
  "confirmText",
  "description",
  "emptyText",
  "errorMessage",
  "helperText",
  "label",
  "placeholder",
  "submitText",
  "successMessage",
  "title",
]);

const USER_FACING_VARIABLE_SUFFIX_RE = /(?:Description|Label|Message|Text|Title)$/u;
const TOAST_METHOD_NAMES = new Set(["error", "info", "success", "warning"]);

function getNodeName(node: ESTree.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === "Identifier") return node.name;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  return null;
}

function containsUserFacingString(node: ESTree.Node | null | undefined): boolean {
  if (!node) return false;
  if (node.type === "Literal") return looksLikeUserFacingJsxText(node.value);
  if (node.type === "TemplateLiteral") {
    return node.quasis.some((quasi) => looksLikeUserFacingJsxText(quasi.value.cooked ?? quasi.value.raw));
  }
  if (node.type === "ConditionalExpression") {
    return containsUserFacingString(node.consequent) || containsUserFacingString(node.alternate);
  }
  if (node.type === "LogicalExpression") {
    return containsUserFacingString(node.left) || containsUserFacingString(node.right);
  }
  if (node.type === "BinaryExpression") {
    return node.operator === "+" && (containsUserFacingString(node.left) || containsUserFacingString(node.right));
  }
  return false;
}

function isUserFacingVariable(node: ESTree.Node | null | undefined): boolean {
  const name = getNodeName(node);
  return name !== null && USER_FACING_VARIABLE_SUFFIX_RE.test(name);
}

function objectContainsUserFacingProperties(node: ESTree.ObjectExpression): boolean {
  return node.properties.some((property) => {
    if (property.type !== "Property") return false;
    const name = getNodeName(property.key);
    return name !== null && USER_FACING_PROPERTY_NAMES.has(name) && containsUserFacingString(property.value);
  });
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
    const skipObjectLiteralCheck = folder === "app" || folder === "config";

    return {
      JSXText(node: JsxTextNode) {
        if (!looksLikeUserFacingJsxText(node.value)) return;

        context.report({
          node,
          message: "User-facing JSX text must come from src/locales/index.ts, not be written inline.",
        });
      },
      JSXAttribute(node: JsxAttributeNode) {
        const name = node.name?.name;
        if (typeof name !== "string" || !USER_FACING_PROPERTY_NAMES.has(name)) return;

        const value = node.value;
        if (!value) return;
        const hasUserFacingString =
          value.type === "JSXExpressionContainer"
            ? containsUserFacingString(value.expression)
            : looksLikeUserFacingJsxText(value.value);

        if (!hasUserFacingString) return;

        context.report({
          node,
          message: "User-facing JSX attribute text must come from src/locales/index.ts, not be written inline.",
        });
      },
      "JSXElement > JSXExpressionContainer, JSXFragment > JSXExpressionContainer"(node: JsxExpressionContainerNode) {
        if (!containsUserFacingString(node.expression)) return;

        context.report({
          node,
          message: "User-facing JSX expression text must come from src/locales/index.ts, not be written inline.",
        });
      },
      ObjectExpression(node) {
        if (
          skipObjectLiteralCheck ||
          node.parent.type === "VariableDeclarator" ||
          !objectContainsUserFacingProperties(node)
        ) {
          return;
        }

        context.report({
          node,
          message: "User-facing object properties must come from src/locales/index.ts, not be written inline.",
        });
      },
      VariableDeclarator(node) {
        if (node.id.type === "Identifier" && isUserFacingVariable(node.id) && containsUserFacingString(node.init)) {
          context.report({
            node,
            message: "User-facing variable text must come from src/locales/index.ts, not be written inline.",
          });
          return;
        }

        if (skipObjectLiteralCheck) return;
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
      AssignmentExpression(node) {
        if (!isUserFacingVariable(node.left) || !containsUserFacingString(node.right)) return;

        context.report({
          node,
          message: "User-facing variable text must come from src/locales/index.ts, not be written inline.",
        });
      },
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") return;

        const objectName = getNodeName(node.callee.object);
        const methodName = getNodeName(node.callee.property);
        if (objectName !== "toast" || methodName === null || !TOAST_METHOD_NAMES.has(methodName)) return;
        if (!containsUserFacingString(node.arguments[0])) return;

        context.report({
          node,
          message: "User-facing toast text must come from src/locales/index.ts, not be written inline.",
        });
      },
    };
  },
};
