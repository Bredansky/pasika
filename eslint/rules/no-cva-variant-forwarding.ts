/**
 * ESLint rule: pasika/no-cva-variant-forwarding
 *
 * Detect only provable identity forwarding: a style map is destructured (or
 * locally accessed by matching keys) and every use just feeds the same CVA
 * option key. This avoids banning meaningful theme maps used elsewhere.
 *
 * @see docs/next-tailwind-guide/rules/component-variant-rule.md
 */
import type { Rule } from "eslint";
import ts from "typescript";

const DOC = "See docs/next-tailwind-guide/rules/component-variant-rule.md";

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

function isCvaOptionProperty(property: ts.PropertyAssignment | ts.ShorthandPropertyAssignment): boolean {
  const optionObject = property.parent;
  if (!ts.isObjectLiteralExpression(optionObject)) return false;
  const category = optionObject.parent;
  if (!ts.isPropertyAssignment(category)) return false;
  const categoryObject = category.parent;
  if (!ts.isObjectLiteralExpression(categoryObject)) return false;
  const variants = categoryObject.parent;
  if (!ts.isPropertyAssignment(variants) || propertyName(variants.name) !== "variants") return false;
  const config = variants.parent;
  if (!ts.isObjectLiteralExpression(config)) return false;
  const call = config.parent;
  return (
    ts.isCallExpression(call) &&
    call.arguments[1] === config &&
    ts.isIdentifier(call.expression) &&
    call.expression.text === "cva"
  );
}

/** Return the CVA choice key if this expression is inside its class value. */
function cvaOptionContaining(node: ts.Node): string | undefined {
  let current = node;
  while (!ts.isSourceFile(current)) {
    const parent = current.parent;
    if (ts.isPropertyAssignment(parent) && parent.initializer === current && isCvaOptionProperty(parent)) {
      return propertyName(parent.name);
    }
    if (ts.isShorthandPropertyAssignment(parent) && parent.name === current && isCvaOptionProperty(parent)) {
      return propertyName(parent.name);
    }
    current = parent;
  }
  return undefined;
}

function report(context: Rule.RuleContext, source: ts.SourceFile, node: ts.Node, mapName: string): void {
  const position = source.getLineAndCharacterOfPosition(node.getStart(source));
  context.report({
    loc: { line: position.line + 1, column: position.character },
    message: `"${mapName}" only forwards identically named style keys into cva(). Define their classes in the CVA options instead of maintaining a parallel variant map. ${DOC}`,
  });
}

function topLevelDeclarations(source: ts.SourceFile): ts.VariableDeclaration[] {
  const declarations: ts.VariableDeclaration[] = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    declarations.push(...statement.declarationList.declarations);
  }
  return declarations;
}

function identityBindingKeys(declaration: ts.VariableDeclaration): Map<string, string> | undefined {
  if (
    !ts.isObjectBindingPattern(declaration.name) ||
    !declaration.initializer ||
    !ts.isIdentifier(declaration.initializer)
  ) {
    return undefined;
  }
  const elements = declaration.name.elements;
  if (elements.length < 2) return undefined;
  const keys = new Map<string, string>();
  for (const element of elements) {
    if (!ts.isIdentifier(element.name) || element.dotDotDotToken !== undefined || element.initializer !== undefined) {
      return undefined;
    }
    const binding = element.name.text;
    let key = binding;
    if (element.propertyName) {
      const member = propertyName(element.propertyName);
      if (member === undefined) return undefined;
      key = member;
    }
    if (keys.has(binding)) return undefined;
    keys.set(binding, key);
  }
  return keys;
}

function isDefinitionIdentifier(node: ts.Identifier): boolean {
  if (ts.isBindingElement(node.parent) && node.parent.name === node) return true;
  if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) return true;
  return ts.isPropertyAssignment(node.parent) && node.parent.name === node;
}

function forwardedBindings(source: ts.SourceFile, keys: Map<string, string>): boolean {
  const used = new Set<string>();
  const state = { invalid: false };
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && keys.has(node.text) && !isDefinitionIdentifier(node)) {
      if (cvaOptionContaining(node) === keys.get(node.text)) used.add(node.text);
      else state.invalid = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return !state.invalid && used.size === keys.size;
}

function identityObjectKeys(declaration: ts.VariableDeclaration): Set<string> | undefined {
  if (
    !ts.isIdentifier(declaration.name) ||
    !declaration.initializer ||
    !ts.isObjectLiteralExpression(declaration.initializer)
  ) {
    return undefined;
  }
  const options = declaration.initializer.properties;
  if (options.length < 2) return undefined;
  const keys = new Set<string>();
  for (const option of options) {
    if (!ts.isPropertyAssignment(option)) return undefined;
    const name = propertyName(option.name);
    if (name === undefined) return undefined;
    keys.add(name);
  }
  return keys;
}

function forwardedObject(source: ts.SourceFile, declaration: ts.VariableDeclaration, keys: Set<string>): boolean {
  if (!ts.isIdentifier(declaration.name)) return false;
  const name = declaration.name.text;
  const used = new Set<string>();
  const state = { invalid: false };
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === name && node !== declaration.name) {
      if (ts.isPropertyAccessExpression(node.parent) && node.parent.expression === node) {
        const key = node.parent.name.text;
        if (keys.has(key) && cvaOptionContaining(node.parent) === key) used.add(key);
        else state.invalid = true;
      } else state.invalid = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return !state.invalid && used.size === keys.size;
}

export const noCvaVariantForwardingRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Reject redundant identity style maps used only to forward CVA variant classes." },
  },
  create(context) {
    if (!/\.[jt]sx?$/.test(context.filename)) return {};
    return {
      "Program:exit"() {
        const source = ts.createSourceFile(
          context.filename,
          context.sourceCode.text,
          ts.ScriptTarget.Latest,
          true,
          context.filename.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        );
        for (const declaration of topLevelDeclarations(source)) {
          if (
            ts.isObjectBindingPattern(declaration.name) &&
            declaration.initializer &&
            ts.isIdentifier(declaration.initializer)
          ) {
            const keys = identityBindingKeys(declaration);
            if (keys && forwardedBindings(source, keys)) {
              report(context, source, declaration, declaration.initializer.text);
            }
          } else if (ts.isIdentifier(declaration.name)) {
            const keys = identityObjectKeys(declaration);
            if (keys && forwardedObject(source, declaration, keys)) {
              report(context, source, declaration, declaration.name.text);
            }
          }
        }
      },
    };
  },
};
