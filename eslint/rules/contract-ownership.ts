import path from "node:path";
import type { Rule } from "eslint";
import type { Node as EstreeNode } from "estree";
import ts from "typescript";

export type ContractOwnership = "first-party" | "third-party" | "platform" | "unknown";

export type ContractEndpoint =
  | { kind: "data-contract"; ownership: ContractOwnership }
  | { kind: "typed-local"; ownership: ContractOwnership }
  | { kind: "non-contract"; ownership: ContractOwnership }
  | { kind: "missing"; ownership: "unknown" };

interface EstreeTsNodeMap {
  get: (node: EstreeNode) => ts.Node | undefined;
}

interface TypedParserServices {
  program: ts.Program;
  esTreeNodeToTSNodeMap: EstreeTsNodeMap;
}

function isTsProgram(value: unknown): value is ts.Program {
  return (
    typeof value === "object" &&
    value !== null &&
    "getTypeChecker" in value &&
    typeof value.getTypeChecker === "function" &&
    "getSourceFiles" in value &&
    typeof value.getSourceFiles === "function"
  );
}

function isEstreeTsNodeMap(value: unknown): value is EstreeTsNodeMap {
  return typeof value === "object" && value !== null && "get" in value && typeof value.get === "function";
}

export function typedParserServices(value: unknown): TypedParserServices | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  if (!("program" in value && "esTreeNodeToTSNodeMap" in value)) return undefined;
  if (!isTsProgram(value.program) || !isEstreeTsNodeMap(value.esTreeNodeToTSNodeMap)) return undefined;
  return { program: value.program, esTreeNodeToTSNodeMap: value.esTreeNodeToTSNodeMap };
}

const ownershipIndexCache = new WeakMap<ts.Program, ContractOwnershipIndex>();

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

function isWithin(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function mergeOwnership(values: ContractOwnership[]): ContractOwnership {
  if (values.length === 0 || values.includes("unknown")) return "unknown";
  const known = new Set(values);
  if (known.size === 1) return [...known][0] ?? "unknown";
  return "unknown";
}

function endpointOwnership(pathValue: string | undefined): ContractOwnership {
  if (pathValue === undefined) return "unknown";
  if (/^https?:\/\//u.test(pathValue)) return "third-party";
  if (pathValue.startsWith("/")) return "first-party";
  return "unknown";
}

function resolvedSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return symbol.flags === ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function propertyName(node: ts.PropertyName | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) return node.text;
  return undefined;
}

class ContractOwnershipIndex {
  private readonly checker: ts.TypeChecker;
  private readonly schemaNodeOwnership = new Map<ts.Node, ContractOwnership>();

  constructor(
    private readonly program: ts.Program,
    private readonly cwd: string,
  ) {
    this.checker = program.getTypeChecker();
    this.indexApiContracts();
  }

  sourceMember(node: ts.Node): ContractEndpoint {
    const symbol = this.checker.getSymbolAtLocation(node) ?? this.memberNameSymbol(node);
    const declarations = this.symbolDeclarations(symbol);
    if (this.isZodSchemaValue(node)) {
      const typeDeclarations = this.typeDeclarations(this.checker.getTypeAtLocation(node));
      const ownership = this.declarationsOwnership(declarations.length > 0 ? declarations : typeDeclarations);
      return { kind: "non-contract", ownership };
    }
    if (declarations.length > 0) return this.endpointFromDeclarations(declarations);

    let object: ts.Expression | undefined;
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) object = node.expression;
    if (!object) return { kind: "missing", ownership: "unknown" };

    const type = this.checker.getTypeAtLocation(object);
    const typeDeclarations = this.typeDeclarations(type);
    if (typeDeclarations.length === 0) return { kind: "missing", ownership: "unknown" };
    return this.endpointFromDeclarations(typeDeclarations);
  }

  targetProperty(node: ts.Node, name: string): ContractEndpoint {
    if (!ts.isPropertyAssignment(node) && !ts.isShorthandPropertyAssignment(node)) {
      return { kind: "missing", ownership: "unknown" };
    }

    const object = node.parent;
    if (!ts.isObjectLiteralExpression(object)) return { kind: "missing", ownership: "unknown" };

    const contextualType = this.checker.getContextualType(object);
    if (!contextualType) return { kind: "missing", ownership: "unknown" };

    const declarations = this.propertyDeclarations(contextualType, name);
    if (declarations.length === 0) return { kind: "missing", ownership: "unknown" };
    return this.endpointFromDeclarations(declarations);
  }

  private memberNameSymbol(node: ts.Node): ts.Symbol | undefined {
    if (ts.isPropertyAccessExpression(node)) return this.checker.getSymbolAtLocation(node.name);
    if (ts.isElementAccessExpression(node)) return this.checker.getSymbolAtLocation(node.argumentExpression);
    return undefined;
  }

  private propertyDeclarations(type: ts.Type, name: string): ts.Declaration[] {
    const types = type.isUnionOrIntersection() ? type.types : [type];
    const declarations: ts.Declaration[] = [];
    for (const item of types) {
      const symbol = this.checker.getPropertyOfType(item, name);
      if (symbol?.declarations) declarations.push(...symbol.declarations);
    }
    return declarations;
  }

  private symbolDeclarations(symbol: ts.Symbol | undefined): ts.Declaration[] {
    if (!symbol) return [];
    return [...(resolvedSymbol(this.checker, symbol).declarations ?? [])];
  }

  private typeDeclarations(type: ts.Type): ts.Declaration[] {
    const declarations = [...(type.aliasSymbol?.declarations ?? []), ...(type.getSymbol()?.declarations ?? [])];
    if (type.isUnionOrIntersection()) {
      for (const item of type.types) {
        declarations.push(...(item.aliasSymbol?.declarations ?? []), ...(item.getSymbol()?.declarations ?? []));
      }
    }
    return declarations;
  }

  private endpointFromDeclarations(declarations: readonly ts.Declaration[]): ContractEndpoint {
    const ownership = this.declarationsOwnership(declarations);
    if (declarations.some((declaration) => this.isDataContractField(declaration))) {
      return { kind: "data-contract", ownership };
    }
    if (
      declarations.some((declaration) => ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration))
    ) {
      return { kind: "typed-local", ownership };
    }
    return { kind: "non-contract", ownership };
  }

  private isDataContractField(declaration: ts.Declaration): boolean {
    if (this.isZodSchemaField(declaration)) return true;
    if (!ts.isPropertySignature(declaration) && !ts.isPropertyDeclaration(declaration)) return false;

    const fileName = normalizePath(declaration.getSourceFile().fileName);
    return /(?:^|\/)database(?:[-.]generated)?\.ts$/u.test(fileName);
  }

  private isZodSchemaValue(node: ts.Node): boolean {
    const type = this.checker.getTypeAtLocation(node);
    return (
      this.checker.getPropertyOfType(type, "_zod") !== undefined &&
      this.checker.getPropertyOfType(type, "parse") !== undefined &&
      this.checker.getPropertyOfType(type, "safeParse") !== undefined
    );
  }

  private isZodSchemaField(declaration: ts.Node): boolean {
    if (!ts.isPropertyAssignment(declaration)) return false;

    let current: ts.Node = declaration.parent;
    while (!ts.isSourceFile(current)) {
      if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name) && current.name.text.endsWith("Schema")) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  private declarationsOwnership(declarations: readonly ts.Declaration[]): ContractOwnership {
    if (declarations.length === 0) return "unknown";
    return mergeOwnership(declarations.map((declaration) => this.declarationOwnership(declaration)));
  }

  private declarationOwnership(declaration: ts.Declaration): ContractOwnership {
    const schemaOwnership = this.schemaOwnership(declaration);
    if (schemaOwnership !== undefined) return schemaOwnership;

    const fileName = declaration.getSourceFile().fileName;
    const normalized = normalizePath(fileName);
    if (/\/typescript\/lib\/lib\.[^/]+\.d\.ts$/u.test(normalized)) return "platform";
    if (normalized.includes("/node_modules/")) return "third-party";
    if (isWithin(this.cwd, path.resolve(fileName))) return "first-party";
    return "unknown";
  }

  private schemaOwnership(declaration: ts.Node): ContractOwnership | undefined {
    let current: ts.Node = declaration;
    while (!ts.isSourceFile(current)) {
      const ownership = this.schemaNodeOwnership.get(current);
      if (ownership !== undefined) return ownership;
      current = current.parent;
    }
    return undefined;
  }

  private indexApiContracts(): void {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile || !isWithin(this.cwd, path.resolve(sourceFile.fileName))) continue;

      const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node) && this.isDefineApiContractCall(node)) this.indexApiContractCall(node);
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
  }

  private isDefineApiContractCall(node: ts.CallExpression): boolean {
    if (ts.isIdentifier(node.expression)) return node.expression.text === "defineApiContract";
    return ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "defineApiContract";
  }

  private indexApiContractCall(node: ts.CallExpression): void {
    const argument = node.arguments[0];
    if (!argument || !ts.isObjectLiteralExpression(argument)) return;

    let pathExpression: ts.Expression | undefined;
    const schemaExpressions: ts.Expression[] = [];

    for (const property of argument.properties) {
      if (ts.isPropertyAssignment(property)) {
        const name = propertyName(property.name);
        if (name === "path") pathExpression = property.initializer;
        if (name === "requestSchema" || name === "responseSchema") schemaExpressions.push(property.initializer);
        continue;
      }

      if (ts.isShorthandPropertyAssignment(property)) {
        const name = property.name.text;
        if (name === "path") pathExpression = property.name;
        if (name === "requestSchema" || name === "responseSchema") schemaExpressions.push(property.name);
      }
    }

    const ownership = endpointOwnership(this.staticString(pathExpression, new Set()));
    // A repository-owned API may re-expose an externally owned schema. Its local
    // route does not transfer authority over that schema back to first-party;
    // first-party ownership is already the default for unmarked declarations.
    if (ownership === "first-party") return;

    for (const expression of schemaExpressions) {
      this.markSchemaExpression(expression, ownership, new Set());
    }
  }

  private staticString(node: ts.Expression | undefined, seen: Set<ts.Symbol>): string | undefined {
    if (!node) return undefined;
    if (ts.isStringLiteralLike(node)) return node.text;

    if (ts.isIdentifier(node)) {
      const symbol = this.checker.getSymbolAtLocation(node);
      if (!symbol || seen.has(symbol)) return undefined;
      seen.add(symbol);
      for (const declaration of resolvedSymbol(this.checker, symbol).declarations ?? []) {
        if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
          const value = this.staticString(declaration.initializer, seen);
          if (value !== undefined) return value;
        }
      }
    }

    return undefined;
  }

  private markSchemaExpression(node: ts.Node, ownership: ContractOwnership, seen: Set<ts.Symbol>): void {
    this.setSchemaOwnership(node, ownership);

    const symbol = this.schemaReferenceSymbol(node);
    if (symbol && !seen.has(symbol)) {
      seen.add(symbol);
      const resolved = resolvedSymbol(this.checker, symbol);
      for (const declaration of resolved.declarations ?? []) {
        this.followSchemaDeclaration(declaration, ownership, seen);
      }
    }

    ts.forEachChild(node, (child) => {
      this.markSchemaExpression(child, ownership, seen);
    });
  }

  private schemaReferenceSymbol(node: ts.Node): ts.Symbol | undefined {
    if (ts.isIdentifier(node)) {
      if (!node.text.endsWith("Schema")) return undefined;
      return this.checker.getSymbolAtLocation(node);
    }
    if (ts.isPropertyAccessExpression(node)) {
      if (!node.name.text.endsWith("Schema")) return undefined;
      return this.checker.getSymbolAtLocation(node.name);
    }
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
      if (!node.argumentExpression.text.endsWith("Schema")) return undefined;
      return this.checker.getSymbolAtLocation(node.argumentExpression);
    }
    return undefined;
  }

  private followSchemaDeclaration(
    declaration: ts.Declaration,
    ownership: ContractOwnership,
    seen: Set<ts.Symbol>,
  ): void {
    this.setSchemaOwnership(declaration, ownership);

    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      this.markSchemaExpression(declaration.initializer, ownership, seen);
      return;
    }
    if (ts.isPropertyAssignment(declaration)) {
      this.markSchemaExpression(declaration.initializer, ownership, seen);
      return;
    }
    if (ts.isShorthandPropertyAssignment(declaration)) {
      const valueSymbol = this.checker.getShorthandAssignmentValueSymbol(declaration);
      if (!valueSymbol || seen.has(valueSymbol)) return;
      seen.add(valueSymbol);
      for (const valueDeclaration of valueSymbol.declarations ?? []) {
        this.followSchemaDeclaration(valueDeclaration, ownership, seen);
      }
    }
  }

  private setSchemaOwnership(node: ts.Node, ownership: ContractOwnership): void {
    const previous = this.schemaNodeOwnership.get(node);
    if (previous === undefined) {
      this.schemaNodeOwnership.set(node, ownership);
      return;
    }
    if (previous !== ownership) this.schemaNodeOwnership.set(node, "unknown");
  }
}

export interface ContractOwnershipResolver {
  sourceMember: (node: EstreeNode) => ContractEndpoint;
  targetProperty: (node: EstreeNode, name: string) => ContractEndpoint;
}

export function contractOwnershipResolver(context: Rule.RuleContext): ContractOwnershipResolver | undefined {
  const services = typedParserServices(context.sourceCode.parserServices);
  if (!services) return undefined;
  const { program, esTreeNodeToTSNodeMap: nodeMap } = services;

  let index = ownershipIndexCache.get(program);
  if (!index) {
    index = new ContractOwnershipIndex(program, context.cwd);
    ownershipIndexCache.set(program, index);
  }

  return {
    sourceMember(node) {
      const tsNode = nodeMap.get(node);
      return tsNode ? index.sourceMember(tsNode) : { kind: "missing", ownership: "unknown" };
    },
    targetProperty(node, name) {
      const tsNode = nodeMap.get(node);
      return tsNode ? index.targetProperty(tsNode, name) : { kind: "missing", ownership: "unknown" };
    },
  };
}
