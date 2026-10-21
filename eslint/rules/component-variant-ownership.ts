/**
 * ESLint rule: pasika/component-variant-ownership
 *
 * Static component variant selections belong to the component's public API,
 * not to string constants created independently by consumers.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { isProductionSource } from "../project/semantic-literals";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const MESSAGE = `A component variant must use a component-owned enum member or imported option, not a consumer-local string constant. Omit the prop for the default variant. ${DOC}`;

type VariantExpression =
  | ESTree.Expression
  | { type: "TSAsExpression" | "TSSatisfiesExpression" | "TSNonNullExpression"; expression: VariantExpression };

function unwrap(expression: VariantExpression): VariantExpression {
  let current = expression;
  while (
    current.type === "TSAsExpression" ||
    current.type === "TSSatisfiesExpression" ||
    current.type === "TSNonNullExpression"
  ) {
    current = current.expression;
  }
  return current;
}

function locallyDeclaredString(
  expression: VariantExpression,
  context: Rule.RuleContext,
  seen: Set<VariantExpression>,
): boolean {
  const value = unwrap(expression);
  if (seen.has(value)) return false;
  seen.add(value);

  if (value.type === "ConditionalExpression") {
    return (
      locallyDeclaredString(value.consequent, context, seen) || locallyDeclaredString(value.alternate, context, seen)
    );
  }
  if (value.type === "LogicalExpression") {
    return locallyDeclaredString(value.right, context, seen);
  }
  if (value.type !== "Identifier") return false;

  for (
    let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(value);
    scope;
    scope = scope.upper
  ) {
    const binding = scope.variables.find((candidate) => candidate.name === value.name);
    if (!binding) continue;
    const declaration = binding.defs.find((definition) => definition.type === "Variable");
    if (!declaration) return false;
    const initializerExpression = declaration.node.init;
    if (declaration.parent.kind !== "const" || !initializerExpression) return false;
    const initializer = unwrap(initializerExpression);
    if (initializer.type === "Literal") return typeof initializer.value === "string";
    if (initializer.type === "TemplateLiteral") return initializer.expressions.length === 0;
    return locallyDeclaredString(initializer, context, seen);
  }
  return false;
}

function isFirstPartyComponent(name: string, context: Rule.RuleContext): boolean {
  for (const statement of context.sourceCode.ast.body) {
    if (statement.type !== "ImportDeclaration") continue;
    if (!statement.specifiers.some((specifier) => specifier.local.name === name)) continue;
    const source = statement.source.value;
    return typeof source === "string" && (source.startsWith(".") || source.startsWith("@/"));
  }
  return true;
}

function isVariantAttribute(node: Rule.Node): node is Rule.Node & {
  name: { type: "JSXIdentifier"; name: "variant" };
  value: { type: "JSXExpressionContainer"; expression: VariantExpression };
} {
  const candidate: unknown = node;
  if (typeof candidate !== "object" || candidate === null || !("name" in candidate) || !("value" in candidate)) {
    return false;
  }
  const { name, value } = candidate;
  return (
    typeof name === "object" &&
    name !== null &&
    "type" in name &&
    name.type === "JSXIdentifier" &&
    "name" in name &&
    name.name === "variant" &&
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "JSXExpressionContainer" &&
    "expression" in value &&
    typeof value.expression === "object" &&
    value.expression !== null &&
    "type" in value.expression
  );
}

export const componentVariantOwnershipRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Require static JSX component variants to come from the component's public option API." },
  },
  create(context) {
    const root = sourceRootOf(context);
    const file = path.resolve(context.filename);
    if (!file.startsWith(root + path.sep) || !isProductionSource(file, root)) return {};

    return {
      JSXAttribute(node: Rule.Node) {
        if (!isVariantAttribute(node)) return;
        const parent: unknown = node.parent;
        if (typeof parent !== "object" || parent === null || !("name" in parent)) return;
        const component = parent.name;
        if (
          typeof component !== "object" ||
          component === null ||
          !("type" in component) ||
          component.type !== "JSXIdentifier" ||
          !("name" in component) ||
          typeof component.name !== "string" ||
          !/^[A-Z]/u.test(component.name)
        ) {
          return;
        }
        if (!isFirstPartyComponent(component.name, context)) return;

        if (locallyDeclaredString(node.value.expression, context, new Set())) {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
};
