/**
 * ESLint rule: pasika/enforce-cn-merge
 *
 * Enforces the "Class Composition Rule".
 *
 * @see docs/next-tailwind-guide/rules/class-composition-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import type { JsxAttributeNode, JsxIdentifier, JsxMemberExpression } from "../ast-types";
import { getProjectIndex } from "../project/index";
import { sourceRootOf } from "./project-root";

function classCount(str: string): number {
  return str.split(/\s+/).filter(Boolean).length;
}

function isComponentName(name: JsxIdentifier | JsxMemberExpression | undefined): boolean {
  return name?.type === "JSXIdentifier" && /^[A-Z]/.test(name.name);
}

function isOuterLayoutClass(className: string): boolean {
  const utility = className.split(":").pop() ?? className;
  return /^(?:-?(?:m|p)[trblsexy]?-.+|(?:min-|max-)?[wh]-.+|size-.+|inset(?:-[xy])?-.+|(?:-?(?:top|right|bottom|left)-.+)|overflow(?:-[xy])?-(?:auto|hidden|clip|visible|scroll)|(?:flex-(?:1|auto|initial|none|grow|shrink|basis-.+)|grow(?:-.+)?|shrink(?:-.+)?|basis-.+|order-.+|(?:col|row)-(?:auto|span-.+|start-.+|end-.+)|(?:self|place-self|justify-self)-.+|z-.+|gap-.+|space-[xy]-.+))$/.test(
    utility,
  );
}

function stringArguments(node: ESTree.Node | null | undefined): string[] {
  if (node?.type === "Literal" && typeof node.value === "string") return [node.value];
  if (node?.type === "TemplateLiteral") return node.quasis.map((quasi) => quasi.value.raw);
  if (node?.type === "ConditionalExpression") {
    return [...stringArguments(node.consequent), ...stringArguments(node.alternate)];
  }
  if (node?.type === "LogicalExpression") return [...stringArguments(node.left), ...stringArguments(node.right)];
  if (node?.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "cn") {
    return node.arguments.flatMap((argument) => stringArguments(argument));
  }
  return [];
}

function staticClassLiterals(node: ESTree.Node | null | undefined): ESTree.Literal[] {
  if (!node) return [];
  if (node.type === "Literal" && typeof node.value === "string") return [node];

  if (node.type === "CallExpression") {
    if (node.callee.type === "Identifier" && node.callee.name === "cn") return [];
    return node.arguments.flatMap((argument) =>
      argument.type === "SpreadElement" ? [] : staticClassLiterals(argument),
    );
  }

  if (node.type === "ObjectExpression") {
    return node.properties.flatMap((property) =>
      property.type === "Property" ? staticClassLiterals(property.value) : [],
    );
  }

  if (node.type === "ArrayExpression") {
    return node.elements.flatMap((element) => (element?.type === "SpreadElement" ? [] : staticClassLiterals(element)));
  }

  if (node.type === "ConditionalExpression") {
    return [...staticClassLiterals(node.consequent), ...staticClassLiterals(node.alternate)];
  }

  if (node.type === "LogicalExpression") {
    return [...staticClassLiterals(node.left), ...staticClassLiterals(node.right)];
  }

  return [];
}

export const enforceCnMergeRule = {
  meta: { schema: [], type: "problem" as const, docs: { description: "Enforce cn() for conditional class merging." } },
  create(context: Rule.RuleContext) {
    // Components imported from a package (lucide icons, next/link, next/image)
    // expose className as their only styling API — typed variant props do not
    // exist there, so the outer-layout contract applies only to components the
    // project defines itself. Names imported from a bare specifier are package
    // components; anything else (local imports, same-file definitions) stays
    // governed by the contract.
    const packageComponents = new Set<string>();
    const index = getProjectIndex(sourceRootOf(context));
    const module = index?.modules.get(path.resolve(context.filename));
    for (const moduleImport of module?.imports ?? []) {
      if (moduleImport.specifier.startsWith(".") || moduleImport.specifier.startsWith("@/")) continue;
      for (const name of moduleImport.names) {
        if (/^[A-Z]/.test(name)) packageComponents.add(name);
      }
    }

    return {
      CallExpression(node: ESTree.CallExpression) {
        if (node.callee.type !== "Identifier") return;

        if (node.callee.name === "cn") {
          for (const argument of node.arguments) {
            if (argument.type !== "Literal" || typeof argument.value !== "string" || classCount(argument.value) <= 5) {
              continue;
            }
            context.report({
              node: argument,
              message:
                "Each cn() string argument must contain at most 5 class names. Group by styling concern. See docs/next-tailwind-guide/rules/class-composition-rule.md",
            });
          }
          return;
        }

        if (node.callee.name !== "cva") return;
        for (const argument of node.arguments) {
          if (argument.type === "SpreadElement") continue;
          for (const literal of staticClassLiterals(argument)) {
            if (typeof literal.value !== "string" || classCount(literal.value) <= 5) continue;
            context.report({
              node: literal,
              message:
                "Static cva class list with more than 5 classes must use cn() with grouped string literals. See docs/next-tailwind-guide/rules/class-composition-rule.md",
            });
          }
        }
      },
      JSXAttribute(node: JsxAttributeNode) {
        const attributeName = node.name?.name ?? "";
        const element = node.parent.parent;
        const componentName = element.openingElement?.name;
        const isComponentProp = isComponentName(componentName);
        const isPackageComponent = componentName?.type === "JSXIdentifier" && packageComponents.has(componentName.name);
        if (isComponentProp && attributeName !== "className" && attributeName.endsWith("ClassName")) {
          context.report({
            node,
            message:
              "Expose appearance through typed variant props instead of separate internal class-name props. See docs/next-tailwind-guide/rules/class-composition-rule.md",
          });
          return;
        }
        if (attributeName !== "className" && attributeName !== "class") return;
        const valueNode = node.value;
        if (!valueNode) return;
        if (isComponentProp && attributeName === "className") {
          // A package component is styled exclusively through className, so the
          // typed-variant contract does not apply to it.
          if (isPackageComponent) return;
          const expression = valueNode.type === "JSXExpressionContainer" ? valueNode.expression : valueNode;
          const invalidClass = stringArguments(expression)
            .flatMap((value) => value.split(/\s+/).filter(Boolean))
            .find((className) => !isOuterLayoutClass(className));
          if (invalidClass) {
            context.report({
              node,
              message: `Passed className contains non-layout utility "${invalidClass}". Expose appearance through typed variant props. See docs/next-tailwind-guide/rules/class-composition-rule.md`,
            });
          }
          return;
        }
        if (valueNode.type === "Literal" && typeof valueNode.value === "string") {
          if (classCount(valueNode.value) > 5) {
            context.report({
              node,
              message:
                "Static className with more than 5 classes must use cn() with grouped string literals. See docs/next-tailwind-guide/rules/class-composition-rule.md",
            });
          }
          return;
        }
        if (valueNode.type !== "JSXExpressionContainer") return;
        const expr = valueNode.expression;
        if (expr.type === "BinaryExpression" && expr.operator === "+") {
          context.report({
            node,
            message:
              "Use cn() instead of + operator for className. See docs/next-tailwind-guide/rules/class-composition-rule.md",
          });
          return;
        }
        if (expr.type === "TemplateLiteral" && expr.expressions.length > 0) {
          context.report({
            node,
            message:
              "Use cn() instead of template literals with conditionals for className. See docs/next-tailwind-guide/rules/class-composition-rule.md",
          });
          return;
        }
        // A bare conditional className ({active && "x"} or {active ? "a" : "b"})
        // is conditional class selection that bypasses the cn() merge point.
        if (expr.type === "LogicalExpression" || expr.type === "ConditionalExpression") {
          context.report({
            node,
            message:
              "Use cn() for conditional classes in className. See docs/next-tailwind-guide/rules/class-composition-rule.md",
          });
          return;
        }
        if (expr.type === "Literal" && typeof expr.value === "string" && classCount(expr.value) > 5) {
          context.report({
            node,
            message:
              "Static className with more than 5 classes must use cn() with grouped string literals. See docs/next-tailwind-guide/rules/class-composition-rule.md",
          });
        }
      },
    };
  },
};
