/**
 * Class strings are styling syntax at cn/CVA call sites, not runtime data
 * requiring constant extraction. Recognize import bindings and distinguish
 * CVA class positions from variant selectors.
 */
import type { Rule } from "eslint";

interface SyntaxNode {
  type: string;
  parent?: SyntaxNode | null;
  callee?: unknown;
  arguments?: unknown;
  key?: unknown;
  value?: unknown;
  elements?: unknown;
  properties?: unknown;
  expression?: unknown;
  consequent?: unknown;
  alternate?: unknown;
  left?: unknown;
  right?: unknown;
  operator?: unknown;
}

const compositionNames = new Set(["cn", "clsx", "twMerge", "twJoin", "cva"]);

function nameOf(node: unknown): string | undefined {
  if (typeof node !== "object" || node === null || !("type" in node)) return undefined;
  if (node.type === "Identifier" && "name" in node && typeof node.name === "string") return node.name;
  if (node.type === "Literal" && "value" in node && typeof node.value === "string") return node.value;
  return undefined;
}

function isStylingModule(module: string, name: string): boolean {
  if (name === "cva") return module === "class-variance-authority";
  return ["pasika/cn", "clsx", "tailwind-merge"].includes(module) && compositionNames.has(name);
}

function compositionName(callee: unknown, node: Rule.Node, context: Rule.RuleContext): string | undefined {
  if (typeof callee !== "object" || callee === null || !("type" in callee)) return undefined;
  const namespace = callee.type === "MemberExpression" && "object" in callee ? nameOf(callee.object) : undefined;
  const member = namespace && "property" in callee ? nameOf(callee.property) : undefined;
  const localName = namespace ?? nameOf(callee);
  if (!localName) return undefined;
  let scope = context.sourceCode.getScope(node);
  for (;;) {
    const variable = scope.set.get(localName);
    if (variable) {
      for (const definition of variable.defs) {
        if (definition.type !== "ImportBinding") continue;
        const module = definition.parent.source.value;
        if (typeof module !== "string") continue;
        if (definition.node.type === "ImportSpecifier" && !namespace) {
          const imported = nameOf(definition.node.imported);
          if (imported && isStylingModule(module, imported)) return imported;
        }
        if (definition.node.type === "ImportDefaultSpecifier" && !namespace && module === "clsx") return "clsx";
        if (definition.node.type === "ImportNamespaceSpecifier" && member && isStylingModule(module, member)) {
          return member;
        }
      }
      return undefined;
    }
    if (scope.upper === null) break;
    scope = scope.upper;
  }
  return !namespace && compositionNames.has(localName) ? localName : undefined;
}

export function isStyleCompositionLiteral(node: Rule.Node, context: Rule.RuleContext): boolean {
  let current: SyntaxNode = node;
  const properties: (string | undefined)[] = [];
  while (current.parent) {
    const parent = current.parent;
    if (parent.type === "CallExpression" && Array.isArray(parent.arguments)) {
      const helper = compositionName(parent.callee, node, context);
      if (!helper) return false;
      if (helper !== "cva") return properties.length === 0 && parent.arguments.includes(current);
      if (parent.arguments[0] === current) return properties.length === 0;
      if (parent.arguments[1] !== current) return false;
      return (
        (properties.length === 3 && properties[2] === "variants") ||
        (properties.length === 2 &&
          properties[1] === "compoundVariants" &&
          (properties[0] === "class" || properties[0] === "className"))
      );
    }
    if (parent.type === "Property" && parent.value === current) {
      properties.push(nameOf(parent.key));
    } else if (
      (parent.type === "ArrayExpression" && Array.isArray(parent.elements) && parent.elements.includes(current)) ||
      (parent.type === "ObjectExpression" && Array.isArray(parent.properties) && parent.properties.includes(current)) ||
      (parent.type === "ConditionalExpression" && (parent.consequent === current || parent.alternate === current)) ||
      (parent.type === "LogicalExpression" &&
        (parent.right === current || (parent.left === current && parent.operator !== "&&"))) ||
      (["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression"].includes(parent.type) &&
        parent.expression === current)
    ) {
      // Continue through class-producing positions only.
    } else return false;
    current = parent;
  }
  return false;
}
