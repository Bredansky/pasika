import type { Rule } from "eslint";
import type * as ESTree from "estree";

interface SyntaxNode {
  type: string;
  parent?: SyntaxNode | null;
  value?: unknown;
  name?: unknown;
  key?: unknown;
  computed?: unknown;
  callee?: unknown;
  arguments?: unknown;
  properties?: unknown;
  elements?: unknown;
}

// The font loaders are compiled by Next.js and read option values from the AST.
// These options cannot be provided through extracted runtime constants.
const fontLoaderOptions = new Set([
  "subsets",
  "weight",
  "style",
  "display",
  "variable",
  "fallback",
  "adjustFontFallback",
  "axes",
  "src",
  "declarations",
]);

function propertyName(key: unknown): string | undefined {
  if (typeof key !== "object" || key === null || !("type" in key)) return undefined;
  if (key.type === "Identifier" && "name" in key && typeof key.name === "string") return key.name;
  if (key.type === "Literal" && "value" in key && typeof key.value === "string") return key.value;
  return undefined;
}

function isImportedNextFont(context: Rule.RuleContext, node: Rule.Node & ESTree.Literal, callee: unknown): boolean {
  if (
    typeof callee !== "object" ||
    callee === null ||
    !("type" in callee) ||
    callee.type !== "Identifier" ||
    !("name" in callee) ||
    typeof callee.name !== "string"
  ) {
    return false;
  }

  let scope = context.sourceCode.getScope(node);
  for (;;) {
    const variable = scope.set.get(callee.name);
    if (variable) {
      return variable.defs.some((definition) => {
        if (definition.type !== "ImportBinding") return false;
        const module = definition.parent.source.value;
        return (
          (module === "next/font/google" && definition.node.type === "ImportSpecifier") ||
          (module === "next/font/local" && definition.node.type === "ImportDefaultSpecifier")
        );
      });
    }

    if (scope.upper === null) return false;
    scope = scope.upper;
  }
}

/**
 * Only literal leaf values of static option objects passed directly to an
 * import-bound Next.js font loader may bypass the named-runtime-value rule.
 * Traversal deliberately stops at computations, helper calls, spreads,
 * and objects that are not direct font-loader arguments.
 */
export function isStaticNextFontLiteral(node: Rule.Node & ESTree.Literal, context: Rule.RuleContext): boolean {
  let current: SyntaxNode = node;
  let option: string | undefined;

  while (current.parent) {
    const parent = current.parent;
    if (parent.type === "ArrayExpression" && Array.isArray(parent.elements) && parent.elements.includes(current)) {
      current = parent;
      continue;
    }
    if (parent.type === "Property" && parent.value === current && parent.computed === false) {
      const owner = parent.parent;
      if (owner?.type === "ObjectExpression" && owner.parent?.type === "CallExpression") {
        option = propertyName(parent.key);
      }
      current = parent;
      continue;
    }
    if (parent.type === "ObjectExpression" && Array.isArray(parent.properties) && parent.properties.includes(current)) {
      current = parent;
      continue;
    }
    return (
      parent.type === "CallExpression" &&
      current.type === "ObjectExpression" &&
      Array.isArray(parent.arguments) &&
      parent.arguments[0] === current &&
      option !== undefined &&
      fontLoaderOptions.has(option) &&
      isImportedNextFont(context, node, parent.callee)
    );
  }

  return false;
}
