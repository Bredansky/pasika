/**
 * ESLint rule: pasika/locale-key-shape
 *
 * A locale key MUST be camelCase English based on the text, unless a direct
 * translation would be unclear or unwieldy. In that case, it MAY describe the
 * message's purpose instead. A key longer than MAX_KEY_LENGTH characters is an
 * unwieldy translation, so it must be purpose-based: it must end in an element
 * role from the WAI-ARIA vocabulary (button, link, dialog, ...).
 *
 * @see docs/code-organization-guide/rules/locales-rule.md
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

function isLocalesFile(filename: string): boolean {
  const segments = path.resolve(filename).split(path.sep);
  const srcIdx = segments.lastIndexOf("src");
  return srcIdx !== -1 && segments[srcIdx + 1] === "locales";
}

function keyName(key: ESTree.Property["key"]): string | undefined {
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return undefined;
}

function reportFor(context: Rule.RuleContext, node: ESTree.Node, message: string): void {
  context.report({ node, message });
}

/** Checks one leaf locale key (a property whose value is a string). */
function checkKey(context: Rule.RuleContext, node: ESTree.Property, name: string): void {
  if (!CAMEL_CASE.test(name)) {
    reportFor(
      context,
      node,
      `Locale key "${name}" must be camelCase English based on the text. See docs/code-organization-guide/rules/locales-rule.md`,
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
      "the message's purpose instead of the text; end it with an element role such as \"Button\", " +
      "\"Link\", or \"Dialog\" (see WAI-ARIA roles). See docs/code-organization-guide/rules/locales-rule.md",
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
    if (!isLocalesFile(context.filename)) return {};

    function visitObject(node: ESTree.ObjectExpression): void {
      for (const property of node.properties) {
        if (property.type !== "Property") continue;
        const name = keyName(property.key);
        if (name === undefined) continue;

        if (property.value.type === "ObjectExpression") {
          visitObject(property.value);
        } else if (property.value.type === "Literal" && typeof property.value.value === "string") {
          checkKey(context, property, name);
        }
      }
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type !== "Identifier" || node.id.name !== "locales") return;
        if (node.init?.type !== "ObjectExpression") return;
        visitObject(node.init);
      },
    };
  },
};
