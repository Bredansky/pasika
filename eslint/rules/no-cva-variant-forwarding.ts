/**
 * ESLint rule: pasika/no-cva-variant-forwarding
 *
 * Detect redundant private, locally declared maps that only forward matching
 * style keys into CVA. Imported and exported maps remain valid shared APIs.
 *
 * @see docs/next-tailwind-guide/rules/component-variant-rule.md
 */
import type { Rule } from "eslint";
import ts from "typescript";

const DOC = "See docs/next-tailwind-guide/rules/component-variant-rule.md";

/** Resolve locally declared string enum members without guessing at imports or dynamic keys. */
function localEnumValue(expression: ts.Expression): string | undefined {
  if (!ts.isPropertyAccessExpression(expression) || !ts.isIdentifier(expression.expression)) return undefined;
  const source = expression.getSourceFile();
  const enumName = expression.expression.text;
  const declaration = source.statements.find(
    (statement) => ts.isEnumDeclaration(statement) && statement.name.text === enumName,
  );
  if (!declaration || !ts.isEnumDeclaration(declaration)) return undefined;
  const member = declaration.members.find(
    (candidate) =>
      (ts.isIdentifier(candidate.name) || ts.isStringLiteral(candidate.name)) &&
      candidate.name.text === expression.name.text,
  );
  return member?.initializer && ts.isStringLiteral(member.initializer) ? member.initializer.text : undefined;
}

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name)) return localEnumValue(name.expression);
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

/** Sharing one private map across multiple CVA definitions is meaningful reuse. */
function owningCvaCall(node: ts.Node): ts.CallExpression | undefined {
  let current = node.parent;
  while (!ts.isSourceFile(current)) {
    if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === "cva") {
      return current;
    }
    current = current.parent;
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
  const calls = new Set<ts.CallExpression>();
  const state = { invalid: false };
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && keys.has(node.text) && !isDefinitionIdentifier(node)) {
      if (cvaOptionContaining(node) === keys.get(node.text)) {
        used.add(node.text);
        const call = owningCvaCall(node);
        if (call) calls.add(call);
      } else state.invalid = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return !state.invalid && used.size === keys.size && calls.size === 1;
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
  const calls = new Set<ts.CallExpression>();
  const state = { invalid: false };
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === name && node !== declaration.name) {
      const parent = node.parent;
      let key: string | undefined;
      if (ts.isPropertyAccessExpression(parent) && parent.expression === node) {
        key = parent.name.text;
      } else if (ts.isElementAccessExpression(parent) && parent.expression === node) {
        key = localEnumValue(parent.argumentExpression);
      }
      if (key && keys.has(key) && cvaOptionContaining(parent) === key) {
        used.add(key);
        const call = owningCvaCall(parent);
        if (call) calls.add(call);
      } else state.invalid = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return !state.invalid && used.size === keys.size && calls.size === 1;
}

/** An imported or exported style map may have independent consumers. */
function privateLocalMap(source: ts.SourceFile, name: string): ts.VariableDeclaration | undefined {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || !statement.declarationList.getText(source).startsWith("const ")) {
      continue;
    }
    if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue;
      if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) return undefined;
      if (
        source.statements.some(
          (entry) =>
            ts.isExportDeclaration(entry) &&
            !entry.moduleSpecifier &&
            entry.exportClause &&
            ts.isNamedExports(entry.exportClause) &&
            entry.exportClause.elements.some((element) => (element.propertyName?.text ?? element.name.text) === name),
        )
      ) {
        return undefined;
      }
      return declaration;
    }
  }
  return undefined;
}

function onlyUsedAt(source: ts.SourceFile, declaration: ts.VariableDeclaration, use: ts.Identifier): boolean {
  if (!ts.isIdentifier(declaration.name)) return false;
  const name = declaration.name.text;
  let count = 0;
  let otherUse = false;
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === name && node !== declaration.name) {
      if (node === use) count++;
      else otherUse = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return count === 1 && !otherUse;
}

function matchingMapKeys(declaration: ts.VariableDeclaration, keys: Map<string, string>): boolean {
  const names = identityObjectKeys(declaration);
  if (names?.size !== keys.size) return false;
  return [...keys.values()].every((key) => names.has(key));
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
            const map = privateLocalMap(source, declaration.initializer.text);
            if (
              keys &&
              map &&
              matchingMapKeys(map, keys) &&
              onlyUsedAt(source, map, declaration.initializer) &&
              forwardedBindings(source, keys)
            ) {
              report(context, source, declaration, declaration.initializer.text);
            }
          } else if (ts.isIdentifier(declaration.name)) {
            const keys = identityObjectKeys(declaration);
            if (
              keys &&
              privateLocalMap(source, declaration.name.text) === declaration &&
              forwardedObject(source, declaration, keys)
            ) {
              report(context, source, declaration, declaration.name.text);
            }
          }
        }
      },
    };
  },
};
