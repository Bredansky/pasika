/**
 * ESLint rule: pasika/ui-state
 *
 * Enforces native or ARIA state expression and Tailwind state variants.
 *
 * @see docs/styling-guide/rules/component-ui-state-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- parser-specific JSX fields are required for this AST rule */

import type { Rule } from "eslint";

const STATE_PROPS = new Set([
  "disabled",
  "loading",
  "selected",
  "expanded",
  "pressed",
  "checked",
  "busy",
  "invalid",
  "open",
]);
const STATE_ATTRIBUTES = new Set([
  "disabled",
  "aria-busy",
  "aria-selected",
  "aria-expanded",
  "aria-pressed",
  "aria-checked",
  "aria-invalid",
  "open",
]);
const STATE_CLASS_RE = /^(?:disabled|aria-(?:busy|selected|expanded|pressed|checked|invalid)|data-\[state)/;

function isComponentElement(node: any): boolean {
  const name = node?.openingElement?.name;
  return name?.type === "JSXIdentifier" && /^[A-Z]/.test(String(name.name));
}

function expressionName(node: any): string | undefined {
  if (node?.type !== "JSXExpressionContainer") return undefined;
  if (node.expression?.type === "Identifier") return String(node.expression.name);
  return undefined;
}

export const uiStateRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require semantic UI states and Tailwind state variants.",
    },
  },
  create(context) {
    return {
      JSXElement(node: any) {
        if (!isComponentElement(node)) return;

        const attributes = node.openingElement.attributes ?? [];
        const names = new Set<string>();
        for (const attribute of attributes) {
          names.add(String(attribute.name?.name));
        }

        for (const attribute of attributes) {
          const name = String(attribute.name?.name);
          const stateName = expressionName(attribute.value);
          if (!stateName || !STATE_PROPS.has(stateName)) continue;
          const hasNativeState = [...STATE_ATTRIBUTES].some((nativeName) => names.has(nativeName));
          if (!hasNativeState) {
            context.report({
              node: attribute,
              message:
                `UI state prop "${name}" should be expressed with a native or ARIA state attribute. ` +
                "See docs/styling-guide/rules/component-ui-state-rule.md",
            });
          }
        }

        for (const attribute of attributes) {
          if (String(attribute.name?.name) !== "className") continue;
          const value = attribute.value;
          const text = value?.type === "Literal" ? String(value.value) : "";
          if (value?.type === "JSXExpressionContainer" && value.expression?.type === "ConditionalExpression") {
            const consequent = value.expression.consequent;
            const alternate = value.expression.alternate;
            const classes = [consequent, alternate]
              .filter((branch: any) => branch?.type === "Literal" && typeof branch.value === "string")
              .flatMap((branch: any) => String(branch.value).split(/\s+/));
            if (classes.length > 0 && !classes.some((className) => STATE_CLASS_RE.test(className))) {
              context.report({
                node: attribute,
                message:
                  "Use a Tailwind state variant for a UI state instead of conditional replacement classes. " +
                  "See docs/styling-guide/rules/component-ui-state-rule.md",
              });
            }
          }
          if (text.split(/\s+/).some((className) => className.includes("state-"))) {
            return;
          }
        }
      },
    };
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any -- re-enable after parser-specific AST access */
