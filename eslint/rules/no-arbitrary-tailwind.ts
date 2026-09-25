/**
 * ESLint rule: pasika/no-arbitrary-tailwind
 *
 * Enforces the "Arbitrary Value Rule" — no arbitrary-value Tailwind classes.
 *
 * @see docs/next-tailwind-guide/rules/arbitrary-value-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";

/**
 * Matches Tailwind arbitrary-value utility classes like rounded-[13px], text-[#fff].
 *
 * Does NOT match variant prefixes like min-[400px]:flex-row or md:flex.
 * The negative lookahead (?![-\w]*:) excludes anything followed by a colon + more.
 *
 * Note: Tailwind breakpoint variants (sm:, md:, lg:, etc.) don't use brackets,
 * so they're never matched. Only bracket-based variants like min-[400px]: need
 * the lookahead exclusion.
 */
const ARBITRARY_VALUE_RE = /(?:^|(?<=\s))(?:[a-z]+(?:-[a-z]+)*)-\[[^\]]+\](?![-\w]*:)/g;

const CLASS_HELPERS = new Set(["cn", "clsx", "twMerge", "twJoin"]);

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
      description: "Disallow Tailwind arbitrary-value classes like rounded-[13px].",
    },
  },
  create(context) {
    function reportClassString(node: Rule.Node, value: string): void {
      ARBITRARY_VALUE_RE.lastIndex = 0;
      const match = ARBITRARY_VALUE_RE.exec(value);
      if (!match) return;
      context.report({
        node,
        message:
          `Tailwind arbitrary-value class "${match[0]}" is not allowed. ` +
          "Use a named token or custom utility. " +
          "See docs/next-tailwind-guide/rules/arbitrary-value-rule.md",
      });
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

    return {
      JSXAttribute(node: JsxAttributeNode) {
        const attributeName = node.name?.name;
        if (attributeName !== "className" && attributeName !== "class") return;

        const value = node.value;
        if (!value) return;
        checkExpression(node, value.type === "JSXExpressionContainer" ? value.expression : value);
      },

      CallExpression(node) {
        if (node.callee.type !== "Identifier" || !CLASS_HELPERS.has(node.callee.name)) return;
        for (const argument of node.arguments) {
          checkExpression(node, argument);
        }
      },
    };
  },
};
