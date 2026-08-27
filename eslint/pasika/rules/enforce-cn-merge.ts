/**
 * ESLint rule: pasika/enforce-cn-merge
 *
 * Enforces the "Class Composition Rule".
 *
 * @see docs/styling-guide/rules/class-composition-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";
import type { JsxAttributeNode, JsxIdentifier, JsxMemberExpression } from "../ast-types";

function classCount(str: string): number {
  return str.split(/\s+/).filter(Boolean).length;
}

function isComponentName(name: JsxIdentifier | JsxMemberExpression | undefined): boolean {
  return name?.type === "JSXIdentifier" && /^[A-Z]/.test(name.name);
}

function isOuterLayoutClass(className: string): boolean {
  const utility = className.split(":").pop() ?? className;
  return /^(?:-?m[trblsexy]?-.+|(?:min-|max-)?[wh]-.+|size-.+|(?:flex-(?:1|auto|initial|none|grow|shrink|basis-.+)|grow(?:-.+)?|shrink(?:-.+)?|basis-.+|order-.+|(?:col|row)-(?:auto|span-.+|start-.+|end-.+)|(?:self|place-self|justify-self)-.+|z-.+|gap-.+|space-[xy]-.+))$/.test(
    utility,
  );
}

function stringArguments(node: ESTree.Node | null | undefined): string[] {
  if (node?.type === "Literal" && typeof node.value === "string") return [node.value];
  if (node?.type === "TemplateLiteral") return node.quasis.map((quasi) => quasi.value.raw);
  if (node?.type === "ConditionalExpression") return [...stringArguments(node.consequent), ...stringArguments(node.alternate)];
  if (node?.type === "LogicalExpression") return [...stringArguments(node.left), ...stringArguments(node.right)];
  if (node?.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "cn") {
    return node.arguments.flatMap((argument) => stringArguments(argument));
  }
  return [];
}

export const enforceCnMergeRule = {
  meta: { schema: [],    type: "problem" as const, docs: { description: "Enforce cn() for conditional class merging." } },
  create(context: Rule.RuleContext) {
    return {
      JSXAttribute(node: JsxAttributeNode) {
        const attributeName = node.name?.name ?? "";
        const element = node.parent.parent;
        const isComponentProp = isComponentName(element.openingElement?.name);
        if (isComponentProp && attributeName !== "className" && attributeName.endsWith("ClassName")) {
          context.report({ node, message: "Expose appearance through typed variant props instead of separate internal class-name props. See docs/styling-guide/rules/class-composition-rule.md" });
          return;
        }
        if (attributeName !== "className" && attributeName !== "class") return;
        const valueNode = node.value;
        if (!valueNode) return;
        if (isComponentProp && attributeName === "className") {
          const expression = valueNode.type === "JSXExpressionContainer" ? valueNode.expression : valueNode;
          const invalidClass = stringArguments(expression).flatMap((value) => value.split(/\s+/).filter(Boolean)).find((className) => !isOuterLayoutClass(className));
          if (invalidClass) context.report({ node, message: `Passed className contains non-layout utility "${invalidClass}". Expose appearance through typed variant props. See docs/styling-guide/rules/class-composition-rule.md` });
          return;
        }
        if (valueNode.type === "Literal" && typeof valueNode.value === "string") {
          if (classCount(valueNode.value) > 5) context.report({ node, message: "Static className with more than 5 classes must use cn() with grouped string literals. See docs/styling-guide/rules/class-composition-rule.md" });
          return;
        }
        if (valueNode.type !== "JSXExpressionContainer") return;
        const expr = valueNode.expression;
        if (expr.type === "BinaryExpression" && expr.operator === "+") {
          context.report({ node, message: "Use cn() instead of + operator for className. See docs/styling-guide/rules/class-composition-rule.md" });
          return;
        }
        if (expr.type === "TemplateLiteral" && expr.expressions.length > 0) {
          context.report({ node, message: "Use cn() instead of template literals with conditionals for className. See docs/styling-guide/rules/class-composition-rule.md" });
          return;
        }
        if (expr.type === "Literal" && typeof expr.value === "string" && classCount(expr.value) > 5) {
          context.report({ node, message: "Static className with more than 5 classes must use cn() with grouped string literals. See docs/styling-guide/rules/class-composition-rule.md" });
          return;
        }
        if (expr.type === "CallExpression" && expr.callee.type === "Identifier" && expr.callee.name === "cn") {
          for (const arg of expr.arguments) {
            if (arg.type === "Literal" && typeof arg.value === "string" && classCount(arg.value) > 5) {
              context.report({ node: arg, message: "Each cn() string argument must contain at most 5 class names. Group by styling concern. See docs/styling-guide/rules/class-composition-rule.md" });
            }
          }
        }
      },
    };
  },
};
