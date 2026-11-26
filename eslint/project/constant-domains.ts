/**
 * Infer bounded semantic domains from resolved consumer sites, not constant
 * spelling or literal equality. Unknown or untyped usages provide no evidence.
 */
import path from "node:path";
import ts from "typescript";
import { comparisonDomain, intrinsicAttributeDomain, mimePrefix, propertyDomain } from "./constant-domain-fallbacks";
import { isProductionSource } from "./semantic-literals";
import { createTypedDomainResolver } from "./typed-constant-domains";

interface DomainEvidence {
  declaration: ts.VariableDeclaration | ts.EnumMember;
  owner: ts.VariableDeclaration | ts.EnumDeclaration;
  domains: Set<string>;
}

interface ConstantDomains {
  byFile: Map<string, DomainEvidence[]>;
  atDeclaration: Map<string, ReadonlySet<string>>;
  moduleConstants: Map<string, ReadonlySet<string>>;
}

const cache = new WeakMap<ts.Program, Map<string, ConstantDomains>>();

function inSource(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function literalInitializer(node: ts.Expression | undefined): boolean {
  if (!node) return false;
  if (
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isTypeAssertionExpression(node)
  ) {
    return literalInitializer(node.expression);
  }
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node);
}

function constDeclaration(symbol: ts.Symbol | undefined): DomainEvidence["declaration"] | undefined {
  const declaration = symbol?.valueDeclaration;
  if (!declaration) return undefined;
  if (
    ts.isVariableDeclaration(declaration) &&
    ts.isIdentifier(declaration.name) &&
    ts.isVariableDeclarationList(declaration.parent) &&
    // eslint-disable-next-line no-bitwise -- TypeScript declaration flags are a bitmask.
    (declaration.parent.flags & ts.NodeFlags.Const) !== 0 &&
    literalInitializer(declaration.initializer)
  ) {
    return declaration;
  }
  if (ts.isEnumMember(declaration) && literalInitializer(declaration.initializer)) return declaration;
  return undefined;
}

function resolvedDeclaration(checker: ts.TypeChecker, node: ts.Expression): DomainEvidence["declaration"] | undefined {
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    return resolvedDeclaration(checker, node.expression);
  }
  const target = ts.isPropertyAccessExpression(node) ? node.name : node;
  if (!ts.isIdentifier(target)) return undefined;
  const symbol = checker.getSymbolAtLocation(target);
  return constDeclaration(symbol?.flags === ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
}

export function constantDomainKey(file: string, name: string): string {
  return `${path.resolve(file)}\u0000${name}`;
}

export function constantDeclarationKey(file: string, line: number, column: number): string {
  return `${path.resolve(file)}\u0000${String(line)}:${String(column)}`;
}

export function distinctKnownDomains(
  first: ReadonlySet<string> | undefined,
  second: ReadonlySet<string> | undefined,
): boolean {
  return Boolean(first?.size && second?.size && [...first].every((domain) => !second.has(domain)));
}

function build(program: ts.Program, root: string): ConstantDomains {
  const checker = program.getTypeChecker();
  const inferDomain = createTypedDomainResolver(checker, root);
  const evidence = new Map<DomainEvidence["declaration"], DomainEvidence>();
  function record(node: ts.Expression, fallback: string | undefined): void {
    const declaration = resolvedDeclaration(checker, node);
    if (!declaration || !inSource(root, declaration.getSourceFile().fileName)) return;
    const domain = inferDomain(node) ?? fallback;
    if (!domain) return;
    const owner = ts.isEnumMember(declaration) ? declaration.parent : declaration;
    const item = evidence.get(declaration) ?? { declaration, owner, domains: new Set<string>() };
    item.domains.add(domain);
    evidence.set(declaration, item);
  }
  function visit(node: ts.Node): void {
    if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression
    ) {
      record(node.initializer.expression, intrinsicAttributeDomain(node));
    }
    if (ts.isPropertyAssignment(node)) record(node.initializer, propertyDomain(program, checker, node));
    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
        node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken)
    ) {
      record(node.left, comparisonDomain(program, checker, node.right));
      record(node.right, comparisonDomain(program, checker, node.left));
    }
    if (ts.isCallExpression(node) && node.arguments[0] && mimePrefix(program, checker, node)) {
      record(node.arguments[0], "media:mime");
    }
    // Direct references in declared call, property, JSX and variable contracts.
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) record(node, undefined);
    ts.forEachChild(node, visit);
  }
  for (const source of program.getSourceFiles()) {
    if (source.isDeclarationFile || !inSource(root, source.fileName) || !isProductionSource(source.fileName, root)) {
      continue;
    }
    visit(source);
  }
  const byFile = new Map<string, DomainEvidence[]>();
  const atDeclaration = new Map<string, ReadonlySet<string>>();
  const moduleConstants = new Map<string, ReadonlySet<string>>();
  for (const item of evidence.values()) {
    const declaration = item.declaration;
    const source = declaration.getSourceFile();
    const file = path.resolve(source.fileName);
    const items = byFile.get(file) ?? [];
    items.push(item);
    byFile.set(file, items);
    if (!ts.isVariableDeclaration(declaration) || !declaration.initializer || !ts.isIdentifier(declaration.name)) {
      continue;
    }
    const position = source.getLineAndCharacterOfPosition(declaration.initializer.getStart(source));
    atDeclaration.set(constantDeclarationKey(file, position.line + 1, position.character), item.domains);
    if (ts.isSourceFile(declaration.parent.parent.parent)) {
      moduleConstants.set(constantDomainKey(file, declaration.name.text), item.domains);
    }
  }
  return { byFile, atDeclaration, moduleConstants };
}

export function getConstantDomains(program: ts.Program, root: string): ConstantDomains {
  const resolvedRoot = path.resolve(root);
  const roots = cache.get(program) ?? new Map<string, ConstantDomains>();
  const existing = roots.get(resolvedRoot);
  if (existing) return existing;
  const result = build(program, resolvedRoot);
  roots.set(resolvedRoot, result);
  cache.set(program, roots);
  return result;
}

export function exportedConstantOwner(owner: DomainEvidence["owner"]): boolean {
  const statement = ts.isVariableDeclaration(owner) ? owner.parent.parent : owner;
  return (
    ts.isSourceFile(statement.parent) &&
    ts.canHaveModifiers(statement) &&
    (ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false)
  );
}
