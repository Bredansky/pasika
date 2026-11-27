/** Recognize the TipTap useEditor styling sink by lexical import identity. */
import type { Rule, SourceCode } from "eslint";
import ts from "typescript";

type EditorBinding = "function" | "namespace";
const bindingCache = new WeakMap<SourceCode, ReadonlyMap<number, EditorBinding>>();

function editorBindings(context: Rule.RuleContext): ReadonlyMap<number, EditorBinding> {
  const cached = bindingCache.get(context.sourceCode);
  if (cached) return cached;
  const bindings = new Map<number, EditorBinding>();
  for (const scope of context.sourceCode.scopeManager.scopes) {
    for (const reference of scope.references) {
      const start = reference.identifier.range?.[0];
      if (start === undefined) continue;
      for (const definition of reference.resolved?.defs ?? []) {
        if (definition.type !== "ImportBinding" || definition.parent.source.value !== "@tiptap/react") continue;
        const specifier = definition.node;
        if (
          specifier.type === "ImportSpecifier" &&
          specifier.imported.type === "Identifier" &&
          specifier.imported.name === "useEditor"
        ) {
          bindings.set(start, "function");
        } else if (specifier.type === "ImportNamespaceSpecifier") {
          bindings.set(start, "namespace");
        }
      }
    }
  }
  bindingCache.set(context.sourceCode, bindings);
  return bindings;
}

function objectProperty(expression: ts.Expression | undefined, name: string): ts.Expression | undefined {
  let current = expression;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isNonNullExpression(current))
  ) {
    current = current.expression;
  }
  if (!current || !ts.isObjectLiteralExpression(current)) return undefined;
  for (const property of [...current.properties].reverse()) {
    if (
      ts.isPropertyAssignment(property) &&
      (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) &&
      property.name.text === name
    ) {
      return property.initializer;
    }
  }
  return undefined;
}

/** Direct editorProps.attributes.class values in a recognized TipTap hook. */
export function tiptapEditorClassValues(context: Rule.RuleContext, call: ts.CallExpression): ts.Expression[] {
  const callee = call.expression;
  const bindings = editorBindings(context);
  const direct = ts.isIdentifier(callee) && bindings.get(callee.getStart()) === "function";
  const member =
    ts.isPropertyAccessExpression(callee) &&
    callee.name.text === "useEditor" &&
    ts.isIdentifier(callee.expression) &&
    bindings.get(callee.expression.getStart()) === "namespace";
  if (!direct && !member) return [];
  const editorProps = objectProperty(call.arguments[0], "editorProps");
  const attributes = objectProperty(editorProps, "attributes");
  const value = objectProperty(attributes, "class");
  return value ? [value] : [];
}
