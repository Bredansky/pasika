/**
 * Resolve finite vocabularies from declared TypeScript contracts. A structural
 * union is not a global identity: keep its declaring contract in the key.
 */
import path from "node:path";
import ts from "typescript";

interface Contract {
  type: ts.Type;
  declaration?: ts.Declaration;
}

type DomainChecker = (expression: ts.Expression, contract: Contract) => string | undefined;

function aliasTarget(checker: ts.TypeChecker, symbol: ts.Symbol | undefined): ts.Symbol | undefined {
  return symbol?.flags === ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function typedDeclaration(declaration: ts.Declaration | undefined): ts.TypeNode | undefined {
  if (!declaration) return undefined;
  if (
    ts.isParameter(declaration) ||
    ts.isPropertySignature(declaration) ||
    ts.isPropertyDeclaration(declaration) ||
    ts.isVariableDeclaration(declaration)
  ) {
    return declaration.type;
  }
  return undefined;
}

function vocabulary(type: ts.Type): string[] | undefined {
  const members = type.isUnion() ? type.types : [type];
  const values: string[] = [];
  for (const member of members) {
    if (member.flags === ts.TypeFlags.Undefined || member.flags === ts.TypeFlags.Null) continue;
    if (!member.isStringLiteral() && !member.isNumberLiteral()) return undefined;
    values.push(JSON.stringify(member.value));
  }
  const unique = [...new Set(values)].sort();
  return unique.length >= 2 ? unique : undefined;
}

function namedDomain(
  checker: ts.TypeChecker,
  typeNode: ts.TypeNode | undefined,
  visited = new Set<ts.Symbol>(),
): ts.Symbol | undefined {
  if (!typeNode) return undefined;
  if (ts.isParenthesizedTypeNode(typeNode)) return namedDomain(checker, typeNode.type, visited);
  if (ts.isUnionTypeNode(typeNode)) {
    const substantive = typeNode.types.filter(
      (member) =>
        member.kind !== ts.SyntaxKind.UndefinedKeyword &&
        !(ts.isLiteralTypeNode(member) && member.literal.kind === ts.SyntaxKind.NullKeyword),
    );
    if (substantive.length === 1) return namedDomain(checker, substantive[0], visited);
    return undefined;
  }
  if (!ts.isTypeReferenceNode(typeNode) || typeNode.typeArguments?.length) return undefined;
  const symbol = aliasTarget(checker, checker.getSymbolAtLocation(typeNode.typeName));
  if (!symbol || visited.has(symbol)) return undefined;
  visited.add(symbol);
  const declaration = symbol.declarations?.find(
    (item) => ts.isTypeAliasDeclaration(item) || ts.isEnumDeclaration(item),
  );
  if (!declaration) return undefined;
  if (ts.isTypeAliasDeclaration(declaration)) {
    return namedDomain(checker, declaration.type, visited) ?? symbol;
  }
  return symbol;
}

function declaredOwner(declaration: ts.Declaration): ts.Node {
  if (ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration)) {
    const parent = declaration.parent;
    if (ts.isTypeLiteralNode(parent) && ts.isTypeAliasDeclaration(parent.parent)) return parent.parent;
    return parent;
  }
  return declaration;
}

function declarationLabel(root: string, declaration: ts.Node): string {
  const source = declaration.getSourceFile();
  const location = source.getLineAndCharacterOfPosition(declaration.getStart(source));
  return `${path.relative(root, source.fileName).replaceAll("\\", "/")}#${String(location.line + 1)}:${String(
    location.character + 1,
  )}`;
}

function ownerLabel(root: string, declaration: ts.Node): string {
  const label =
    (ts.isInterfaceDeclaration(declaration) ||
      ts.isTypeAliasDeclaration(declaration) ||
      ts.isClassDeclaration(declaration) ||
      ts.isEnumDeclaration(declaration)) &&
    declaration.name
      ? declaration.name.text
      : "contract";
  return `${label} [${declarationLabel(root, declaration)}]`;
}

function propertyContract(checker: ts.TypeChecker, type: ts.Type | undefined, name: string): Contract | undefined {
  if (!type) return undefined;
  const property = checker.getPropertyOfType(type, name);
  const declaration = property?.valueDeclaration ?? property?.declarations?.[0];
  if (!property || !declaration) return undefined;
  return { type: checker.getTypeOfSymbolAtLocation(property, declaration), declaration };
}

function expressionContract(checker: ts.TypeChecker, expression: ts.Expression): Contract | undefined {
  const parent = expression.parent;
  const contextual = (): ts.Type | undefined => checker.getContextualType(expression);
  if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
    const index = parent.arguments?.indexOf(expression) ?? -1;
    if (index < 0) return undefined;
    const parameter = checker.getResolvedSignature(parent)?.getParameters()[index];
    const declaration = parameter?.valueDeclaration ?? parameter?.declarations?.[0];
    const expected = contextual();
    if (!declaration || !expected) return undefined;
    return { type: expected, declaration };
  }
  if (
    ts.isPropertyAssignment(parent) &&
    parent.initializer === expression &&
    ts.isObjectLiteralExpression(parent.parent)
  ) {
    if (!ts.isIdentifier(parent.name) && !ts.isStringLiteral(parent.name)) return undefined;
    return propertyContract(checker, checker.getContextualType(parent.parent), parent.name.text);
  }
  if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent) && ts.isIdentifier(parent.parent.name)) {
    const attribute = parent.parent;
    const property = checker.getSymbolAtLocation(attribute.name);
    const declaration = property?.valueDeclaration ?? property?.declarations?.[0];
    const expected = contextual();
    return expected && declaration ? { type: expected, declaration } : undefined;
  }
  if (ts.isVariableDeclaration(parent) && parent.initializer === expression && parent.type) {
    return { type: checker.getTypeFromTypeNode(parent.type), declaration: parent };
  }
  return undefined;
}

export function createTypedDomainResolver(
  checker: ts.TypeChecker,
  root: string,
): (expression: ts.Expression) => string | undefined {
  const fromContract: DomainChecker = (expression, contract) => {
    const actual = checker.getTypeAtLocation(expression);
    const values = vocabulary(contract.type);
    if (!values || !checker.isTypeAssignableTo(actual, contract.type)) return undefined;
    const declaration = contract.declaration;
    if (!declaration) return undefined;
    const declaredType = typedDeclaration(declaration);
    // A generic parameter inferred from the argument is not an independently
    // declared vocabulary. Require a finite, explicitly declared type as well.
    if (!declaredType || !vocabulary(checker.getTypeFromTypeNode(declaredType))) return undefined;
    // A union explicitly containing a member of an enum is a projection of
    // that enum, not evidence that the member has acquired another meaning.
    const member = actual.getSymbol()?.valueDeclaration;
    if (
      member &&
      ts.isEnumMember(member) &&
      (contract.type === actual || (contract.type.isUnion() && contract.type.types.includes(actual)))
    ) {
      return `ts-enum:${ownerLabel(root, member.parent)}`;
    }
    const symbol = namedDomain(checker, declaredType);
    const named = symbol?.declarations?.[0];
    if (named) return (ts.isEnumDeclaration(named) ? "ts-enum:" : "ts:") + ownerLabel(root, named);
    const owner = declaredOwner(declaration);
    return `ts:${ownerLabel(root, owner)} :: ${values.join(" | ")}`;
  };
  return (expression) => {
    const contract = expressionContract(checker, expression);
    return contract ? fromContract(expression, contract) : undefined;
  };
}

/** Library ownership is weaker than domain identity, but enough to avoid
 * treating every related API type in a library as an unrelated concern. */
function contractFile(domain: string): string | undefined {
  return /\[(?<file>[^\]]+)#\d+:\d+\]/u.exec(domain)?.groups?.file;
}

function externalPackage(domain: string): string | undefined {
  const file = contractFile(domain);
  if (file?.includes("/typescript/lib/lib.")) return undefined;
  return file?.match(/(?:^|\/)node_modules\/(?<package>(?:@[^/]+\/)?[^/]+)/u)?.groups?.package;
}

export function constantDomainFamily(domain: string): string {
  if (domain.startsWith("ts:") || domain.startsWith("ts-enum:")) {
    const pkg = externalPackage(domain);
    if (pkg) return `ts-package:${pkg}`;
    // Existing co-located enums do not by themselves prove unrelated concerns.
    if (domain.startsWith("ts-enum:")) return `ts-enums:${contractFile(domain) ?? domain}`;
    return domain.split(" :: ")[0] ?? domain;
  }
  return domain.split(":")[0] ?? domain;
}

export function hasConflictingDomains(domains: ReadonlySet<string>): boolean {
  const values = [...domains];
  return values.some((first, index) =>
    values.slice(index + 1).some((second) => {
      const pkg = externalPackage(first);
      // Library contracts can be different views of one vocabulary (e.g.
      // Node's BufferEncoding and BinaryToTextEncoding). Identity stays
      // distinct for deduplication, but disagreement is not proven here.
      return !pkg || pkg !== externalPackage(second);
    }),
  );
}
