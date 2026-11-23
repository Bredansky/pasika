/**
 * Resolve explicit closed domains assembled from first-party string constants
 * in z.enum([...]) calls, including imports and re-exports.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import ts from "typescript";

const cache = new WeakMap<ts.Program, { root: string; members: ReadonlySet<string> }>();

interface LiteralDeclaration {
  file: string;
  name: string;
  value: string;
}

function isSourceModule(source: ts.SourceFile, root: string): boolean {
  const file = path.resolve(source.fileName);
  return !source.isDeclarationFile && file.startsWith(root + path.sep) && !/\.(?:test|spec|mock)\.[jt]sx?$/u.test(file);
}

/** Accept actual Zod namespace imports, not unrelated objects with an enum method. */
function isZodEnumCall(node: ts.Node, checker: ts.TypeChecker): node is ts.CallExpression {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.name.text !== "enum" ||
    !ts.isIdentifier(node.expression.expression)
  ) {
    return false;
  }
  const namespace = checker.getSymbolAtLocation(node.expression.expression);
  return (namespace?.declarations ?? []).some((declaration) => {
    if (!ts.isImportSpecifier(declaration) && !ts.isNamespaceImport(declaration)) return false;
    const importedFrom = ts.isImportSpecifier(declaration)
      ? declaration.parent.parent.parent
      : declaration.parent.parent;
    if (!ts.isStringLiteral(importedFrom.moduleSpecifier) || !/^zod(?:\/|$)/u.test(importedFrom.moduleSpecifier.text)) {
      return false;
    }
    return ts.isNamespaceImport(declaration) || (declaration.propertyName ?? declaration.name).text === "z";
  });
}

function unwrap(expression: ts.Expression): ts.Expression {
  let result = expression;
  while (ts.isParenthesizedExpression(result) || ts.isAsExpression(result) || ts.isSatisfiesExpression(result)) {
    result = result.expression;
  }
  return result;
}

/**
 * Only infer a domain when *every* entry resolves to a top-level const with a
 * literal string initializer and the resulting set contains two distinct values.
 * Unknown references and partial sets must not trigger an enum migration.
 */
export function semanticZodEnumMembers(program: ts.Program, sourceRoot: string): ReadonlySet<string> {
  const root = path.resolve(sourceRoot);
  const cached = cache.get(program);
  if (cached?.root === root) return cached.members;

  const checker = program.getTypeChecker();
  const declarations = new Map<ts.Symbol, LiteralDeclaration>();
  const members = new Set<string>();

  for (const source of program.getSourceFiles()) {
    if (!isSourceModule(source, root)) continue;
    const file = path.resolve(source.fileName);
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement) || statement.declarationList.flags !== ts.NodeFlags.Const) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        const value = unwrap(declaration.initializer);
        if (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value)) continue;
        const symbol = checker.getSymbolAtLocation(declaration.name);
        if (symbol) declarations.set(symbol, { file, name: declaration.name.text, value: value.text });
      }
    }
  }

  for (const source of program.getSourceFiles()) {
    if (!isSourceModule(source, root)) continue;
    function visit(node: ts.Node): void {
      if (isZodEnumCall(node, checker)) {
        const arg = node.arguments[0] ? unwrap(node.arguments[0]) : undefined;
        if (arg && ts.isArrayLiteralExpression(arg) && arg.elements.length >= 2) {
          const references = arg.elements.map((element) => {
            if (!ts.isIdentifier(element)) return undefined;
            const symbol = checker.getSymbolAtLocation(element);
            if (!symbol) return undefined;
            const original = symbol.flags === ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
            return declarations.get(original);
          });
          const complete = references.filter((reference): reference is LiteralDeclaration => reference !== undefined);
          if (
            complete.length === references.length &&
            new Set(complete.map((reference) => reference.value)).size >= 2
          ) {
            for (const reference of complete) {
              members.add(`${reference.file}:${reference.name}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }

  cache.set(program, { root, members });
  return members;
}
