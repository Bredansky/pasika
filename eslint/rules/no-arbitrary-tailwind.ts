/**
 * ESLint rule: pasika/no-arbitrary-tailwind
 *
 * Enforces the "Arbitrary Value Rule" — no arbitrary-value Tailwind classes.
 *
 * @see docs/next-tailwind-guide/rules/arbitrary-value-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

const ARBITRARY_VALUE_RE = /\[[^\]]+\]/;
const CUSTOM_PROPERTY_VALUE_RE = /\((?:[a-z][a-z0-9-]*:)?--[^)]+\)/;

/**
 * Returns the utility portion after Tailwind variants while ignoring colons
 * nested inside arbitrary variants and values.
 */
function baseUtility(className: string): string {
  let squareDepth = 0;
  let roundDepth = 0;
  let lastVariantSeparator = -1;

  for (let index = 0; index < className.length; index += 1) {
    const character = className[index];
    if (character === "[") squareDepth += 1;
    else if (character === "]") squareDepth = Math.max(0, squareDepth - 1);
    else if (character === "(") roundDepth += 1;
    else if (character === ")") roundDepth = Math.max(0, roundDepth - 1);
    else if (character === ":" && squareDepth === 0 && roundDepth === 0) lastVariantSeparator = index;
  }

  return className.slice(lastVariantSeparator + 1);
}

function rawValueUtility(className: string): string | undefined {
  const utility = baseUtility(className);
  if (ARBITRARY_VALUE_RE.test(utility) || CUSTOM_PROPERTY_VALUE_RE.test(utility)) {
    return utility;
  }
  return undefined;
}

const CLASS_HELPERS = new Set(["cn", "clsx", "twMerge", "twJoin"]);

function isClassProperty(property: ESTree.Property): boolean {
  const { key } = property;
  if (key.type === "Identifier") return key.name === "className" || key.name === "class";
  if (key.type !== "Literal" || typeof key.value !== "string") return false;
  return key.value === "className" || key.value === "class";
}

/**
 * ESTree carries no JSX types, so the two JSX shapes this rule reads are declared
 * here. Everything inside a container is an ordinary expression again.
 */
interface JsxExpressionContainer {
  type: "JSXExpressionContainer";
  expression: ESTree.Expression;
}

type JsxAttributeNode = Rule.Node & {
  name?: { name?: unknown };
  value?: ESTree.Literal | JsxExpressionContainer | null;
};

export const noArbitraryTailwindRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Disallow raw Tailwind arbitrary and custom-property value classes in components.",
    },
  },
  create(context) {
    function reportClassString(node: Rule.Node, value: string): void {
      for (const className of value.split(/\s+/)) {
        if (!className) continue;
        const utility = rawValueUtility(className);
        if (!utility) continue;

        context.report({
          node,
          message:
            `Tailwind raw-value class "${utility}" is not allowed. ` +
            "Define and use a named utility instead. " +
            "See docs/next-tailwind-guide/rules/arbitrary-value-rule.md",
        });
      }
    }

    /** Walks every expression a class name can hide in: conditionals, arrays, and object keys. */
    function checkExpression(node: Rule.Node, expression: ESTree.Node | null | undefined): void {
      if (!expression) return;

      if (expression.type === "Literal") {
        if (typeof expression.value === "string") reportClassString(node, expression.value);
        return;
      }

      if (expression.type === "TemplateLiteral") {
        for (const quasi of expression.quasis) reportClassString(node, quasi.value.raw);
        return;
      }

      if (expression.type === "LogicalExpression") {
        checkExpression(node, expression.left);
        checkExpression(node, expression.right);
        return;
      }

      if (expression.type === "ConditionalExpression") {
        checkExpression(node, expression.consequent);
        checkExpression(node, expression.alternate);
        return;
      }

      if (expression.type === "AssignmentPattern") {
        checkExpression(node, expression.right);
        return;
      }

      if (expression.type === "ArrayExpression") {
        for (const element of expression.elements) checkExpression(node, element);
        return;
      }

      if (expression.type === "ObjectExpression") {
        // clsx and cn accept `{ "px-[3px]": isActive }`, so the keys carry classes.
        for (const property of expression.properties) {
          if (property.type === "Property") checkExpression(node, property.key);
        }
      }
    }

    /** Walks cva() arguments, where class strings live in object values rather than keys. */
    function checkCvaExpression(node: Rule.Node, expression: ESTree.Node | null | undefined): void {
      if (!expression) return;

      if (expression.type === "ObjectExpression") {
        for (const property of expression.properties) {
          if (property.type === "Property") {
            if (!isClassProperty(property)) checkCvaExpression(node, property.value);
          } else {
            checkCvaExpression(node, property.argument);
          }
        }
        return;
      }

      if (expression.type === "ArrayExpression") {
        for (const element of expression.elements) checkCvaExpression(node, element);
        return;
      }

      if (expression.type === "LogicalExpression") {
        checkCvaExpression(node, expression.left);
        checkCvaExpression(node, expression.right);
        return;
      }

      if (expression.type === "ConditionalExpression") {
        checkCvaExpression(node, expression.consequent);
        checkCvaExpression(node, expression.alternate);
        return;
      }

      checkExpression(node, expression);
    }

    return {
      JSXAttribute(node: JsxAttributeNode) {
        const attributeName = node.name?.name;
        if (attributeName !== "className" && attributeName !== "class") return;

        const value = node.value;
        if (!value) return;
        checkExpression(node, value.type === "JSXExpressionContainer" ? value.expression : value);
      },

      Property(node: Rule.Node & ESTree.Property) {
        if (!isClassProperty(node)) return;
        checkExpression(node, node.value);
      },

      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;

        if (CLASS_HELPERS.has(node.callee.name)) {
          for (const argument of node.arguments) {
            checkExpression(node, argument);
          }
          return;
        }

        if (node.callee.name === "cva") {
          for (const argument of node.arguments) {
            checkCvaExpression(node, argument);
          }
        }
      },
    };
  },
};
