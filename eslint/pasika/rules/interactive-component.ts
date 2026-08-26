/**
 * ESLint rule: pasika/interactive-component
 *
 * Interactive elements are component boundaries when they are mixed with other
 * content in the same component. Standalone interactive components are valid.
 *
 * @see docs/code-organization-guide/rules/interactive-component-rule.md
 */

import type { Rule } from "eslint";
import type { JsxElementNode, MaybeJsxElement } from "../ast-types.js";

const INTERACTIVE_TAGS = new Set([
  "a",
  "button",
  "details",
  "embed",
  "iframe",
  "input",
  "label",
  "select",
  "textarea",
  "video",
]);

function tagName(node: MaybeJsxElement): string | undefined {
  const name = node.openingElement?.name;
  if (name?.type !== "JSXIdentifier") return undefined;
  return name.name;
}

function isInteractive(node: MaybeJsxElement): boolean {
  const name = tagName(node);
  return name !== undefined && INTERACTIVE_TAGS.has(name);
}

function isComponentElement(node: MaybeJsxElement): boolean {
  const name = tagName(node);
  return name !== undefined && /^[A-Z]/.test(name);
}

function isComponentReturn(node: JsxElementNode): boolean {
  const parent = node.parent;
  if (parent.type === "ReturnStatement") return true;
  return parent.type === "ArrowFunctionExpression" && parent.body === node;
}

export const interactiveComponentRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require interactive HTML elements mixed with other content to be extracted into components.",
    },
  },
  create(context) {
    if (!context.filename.endsWith(".tsx") && !context.filename.endsWith(".jsx")) return {};

    return {
      JSXElement(node: JsxElementNode) {
        if (!isInteractive(node)) return;
        if (isComponentElement(node.parent)) {
          return;
        }
        if (isInteractive(node.parent)) {
          return;
        }
        if (isComponentReturn(node)) {
          return;
        }

        const name = tagName(node);
        if (name === undefined) return;
        context.report({
          node,
          message:
            `Extract the interactive <${name}> into a descriptive component. ` +
            "See docs/code-organization-guide/rules/interactive-component-rule.md",
        });
      },
    };
  },
};
