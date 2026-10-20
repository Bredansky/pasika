/**
 * ESLint rule: pasika/locale-key-shape
 *
 * A locale key MUST be English camelCase based on the text. A key longer than
 * MAX_KEY_LENGTH characters is an unwieldy translation, so it must be
 * purpose-based: it must end in an element role from the WAI-ARIA vocabulary
 * (button, link, dialog, ...).
 * Feature namespaces may contain locale strings, but not nested objects.
 *
 * @see docs/next-codebase-guide/rules/locales-rule.md
 * @see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";

/** Keys longer than this read as unwieldy translations and must be purpose-based. */
const MAX_KEY_LENGTH = 30;

/**
 * Element roles from WAI-ARIA that a purpose-based locale key may end in,
 * in the PascalCase form they take at the end of a camelCase key.
 */
const ROLE_POSTFIXES = new Set([
  "Button",
  "Link",
  "Dialog",
  "AlertDialog",
  "Tooltip",
  "Banner",
  "Alert",
  "Status",
  "Tab",
  "TabPanel",
  "Menu",
  "MenuItem",
  "MenuBar",
  "Checkbox",
  "Radio",
  "RadioGroup",
  "Switch",
  "ComboBox",
  "ListBox",
  "Option",
  "Search",
  "SearchBox",
  "Navigation",
  "ProgressBar",
  "Slider",
  "SpinButton",
  "TextBox",
  "Tree",
  "TreeItem",
  "TreeGrid",
  "Grid",
  "GridCell",
  "Feed",
  "Log",
  "Timer",
  "Marquee",
  "Region",
  "Main",
  "Complementary",
  "ContentInfo",
  "Form",
  "Toolbar",
  "ScrollBar",
]);

const CAMEL_CASE = /^[a-z][a-zA-Z0-9]*$/;

/** A key uses the Latin alphabet only (English). ASCII separators pass through to the camelCase check. */
const ENGLISH = /^[A-Za-z0-9_]*$/;

function dictionaryName(filename: string): string | undefined {
  const segments = path.resolve(filename).split(path.sep);
  const srcIdx = segments.lastIndexOf("src");
  if (srcIdx < 0 || segments[srcIdx + 1] !== "locales") return undefined;
  const remaining = segments.slice(srcIdx + 2);
  if (
    remaining.length === 1 &&
    remaining[0] !== "index.ts" &&
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.ts$/.test(remaining[0] ?? "")
  ) {
    return remaining[0]?.slice(0, -3).replace(/-[a-z]/g, (match) => match.slice(1).toUpperCase());
  }
  return undefined;
}

function keyName(key: ESTree.Property["key"]): string | undefined {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return undefined;
}

function reportFor(context: Rule.RuleContext, node: ESTree.Node, message: string): void {
  context.report({ node, message });
}

/** TypeScript `as const` and `satisfies` wrap a locale literal in an expression node. */
function isLocaleWrapper(node: ESTree.Node): node is ESTree.Node & { expression: ESTree.Node } {
  return (
    ["TSAsExpression", "TSSatisfiesExpression"].includes(node.type) &&
    "expression" in node &&
    typeof node.expression === "object" &&
    "type" in node.expression
  );
}

/** Extracts a locale object literal through TypeScript expression wrappers. */
function localeObject(node: ESTree.Node | null | undefined): ESTree.ObjectExpression | undefined {
  let current = node;
  while (current) {
    if (current.type === "ObjectExpression") return current;
    if (!isLocaleWrapper(current)) return undefined;
    current = current.expression;
  }
  return undefined;
}

/** Checks one leaf locale key (a property whose value is a string). */
function checkKey(context: Rule.RuleContext, node: ESTree.Property, name: string): void {
  if (!ENGLISH.test(name)) {
    reportFor(
      context,
      node,
      `Locale key "${name}" must be English; write it in the Latin alphabet. See docs/next-codebase-guide/rules/locales-rule.md`,
    );
    return;
  }

  if (!CAMEL_CASE.test(name)) {
    reportFor(
      context,
      node,
      `Locale key "${name}" must be camelCase English based on the text. See docs/next-codebase-guide/rules/locales-rule.md`,
    );
    return;
  }

  if (name.length <= MAX_KEY_LENGTH) return;
  const hasRolePostfix = [...ROLE_POSTFIXES].some((role) => name.endsWith(role));
  if (hasRolePostfix) return;

  reportFor(
    context,
    node,
    `Locale key "${name}" is longer than ${String(MAX_KEY_LENGTH)} characters, so it must describe ` +
      'the message\'s purpose instead of the text; end it with an element role such as "Button", ' +
      '"Link", or "Dialog" (see WAI-ARIA roles). See docs/next-codebase-guide/rules/locales-rule.md',
  );
}

export const localeKeyShapeRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require locale keys to be camelCase, and purpose-based element roles when long.",
    },
  },
  create(context) {
    const dictionary = dictionaryName(context.filename) ?? "";
    if (!dictionary) return {};

    function visitObject(node: ESTree.ObjectExpression): void {
      for (const property of node.properties) {
        if (property.type !== "Property") continue;
        const name = keyName(property.key);
        if (name === undefined) continue;

        const nested = localeObject(property.value);
        if (nested) {
          reportFor(
            context,
            property,
            `Locale "${dictionary}.${name}" must not be a nested object. Keep string keys directly inside the "${dictionary}" namespace. See docs/next-codebase-guide/rules/locales-rule.md`,
          );
        } else if (
          (property.value.type === "Literal" && typeof property.value.value === "string") ||
          (property.value.type === "TemplateLiteral" && property.value.expressions.length === 0)
        ) {
          checkKey(context, property, name);
        }
      }
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || node.id.name !== dictionary) return;
        const root = localeObject(node.init);
        if (!root) return;
        visitObject(root);
      },
    };
  },
};
