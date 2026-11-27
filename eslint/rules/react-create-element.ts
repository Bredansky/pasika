/**
 * Recognize React createElement by lexical import identity, not a local name.
 * Reference offsets let the ESTree and TypeScript visitors share the same bindings.
 */
import type { Rule, SourceCode } from "eslint";
import ts from "typescript";

type ReactBinding = "function" | "namespace";
const bindingCache = new WeakMap<SourceCode, ReadonlyMap<number, ReactBinding>>();

function reactBindings(context: Rule.RuleContext): ReadonlyMap<number, ReactBinding> {
  const cached = bindingCache.get(context.sourceCode);
  if (cached) return cached;
  const bindings = new Map<number, ReactBinding>();
  for (const scope of context.sourceCode.scopeManager.scopes) {
    for (const reference of scope.references) {
      const start = reference.identifier.range?.[0];
      if (start === undefined) continue;
      for (const definition of reference.resolved?.defs ?? []) {
        if (definition.type !== "ImportBinding" || definition.parent.source.value !== "react") continue;
        const specifier = definition.node;
        if (
          specifier.type === "ImportSpecifier" &&
          specifier.imported.type === "Identifier" &&
          specifier.imported.name === "createElement"
        ) {
          bindings.set(start, "function");
        } else if (specifier.type === "ImportDefaultSpecifier" || specifier.type === "ImportNamespaceSpecifier") {
          bindings.set(start, "namespace");
        }
      }
    }
  }
  bindingCache.set(context.sourceCode, bindings);
  return bindings;
}

export function isReactCreateElementReference(
  context: Rule.RuleContext,
  start: number | undefined,
  member?: string,
): boolean {
  if (start === undefined) return false;
  const binding = reactBindings(context).get(start);
  return member === undefined ? binding === "function" : member === "createElement" && binding === "namespace";
}

function unwrapProps(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/** Direct className values in the second argument of a React element factory. */
export function reactCreateElementClassValues(context: Rule.RuleContext, call: ts.CallExpression): ts.Expression[] {
  const callee = call.expression;
  const direct = ts.isIdentifier(callee) && isReactCreateElementReference(context, callee.getStart());
  const member =
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    isReactCreateElementReference(context, callee.expression.getStart(), callee.name.text);
  if (!direct && !member) return [];
  const props = call.arguments[1];
  if (!props) return [];
  const object = unwrapProps(props);
  if (!ts.isObjectLiteralExpression(object)) return [];
  const values: ts.Expression[] = [];
  for (const property of object.properties) {
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === "className") {
      values.push(property.name);
    } else if (
      ts.isPropertyAssignment(property) &&
      (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
      property.name.text === "className"
    ) {
      values.push(property.initializer);
    }
  }
  return values;
}
