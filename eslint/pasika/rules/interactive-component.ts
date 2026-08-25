/**
 * ESLint rule: pasika/interactive-component
 *
 * Interactive elements are component boundaries when they are mixed with other
 * content in the same component. Standalone interactive components are valid.
 *
 * @see docs/code-organization-guide/rules/interactive-component-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- parser-specific JSX fields are required for this AST rule */

import type { Rule } from "eslint";

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

function isJsxElement(node: any): boolean {
  return node?.type === "JSXElement";
}

function tagName(node: any): string | undefined {
  if (!isJsxElement(node) || node.openingElement?.name?.type !== "JSXIdentifier") return undefined;
  return String(node.openingElement.name.name);
}

function isInteractive(node: any): boolean {
  const name = tagName(node);
  return name !== undefined && INTERACTIVE_TAGS.has(name);
}

function isComponentElement(node: any): boolean {
  const name = tagName(node);
  return name !== undefined && /^[A-Z]/.test(name);
}
function isComponentReturn(node: any): boolean {
  const parent = node?.parent;
  if (parent?.type === "ReturnStatement") return true;
  return parent?.type === "ArrowFunctionExpression" && parent.body === node;
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
      JSXElement(node: any) {
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

        context.report({
          node,
          message:
            `Extract the interactive <${String(node.openingElement.name.name)}> into a descriptive component. ` +
            "See docs/code-organization-guide/rules/interactive-component-rule.md",
        });
      },
    };
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- parser-specific JSX fields are required only within this AST rule */
