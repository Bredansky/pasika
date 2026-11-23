/**
 * ESLint rule: pasika/prefer-enum
 *
 * Closed property domains use TypeScript enums even when the project names
 * only one of their possible values. Other inferred domains must demonstrate
 * at least two alternatives before requiring an enum.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import { definitionSyntax, lexer, parse } from "@eslint/css-tree";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import ts from "typescript";
import type {
  CallExpressionNode,
  TsAsExpressionNode,
  TsIndexedAccessTypeNode,
  TsPropertySignatureNode,
  TsTypeAliasDeclarationNode,
  TsTypeNode,
  VariableDeclaratorNode,
} from "../ast-types";
import { typedParserServices } from "./contract-ownership";
import { semanticZodEnumMembers } from "./prefer-enum-zod";
import { sourceRootOf } from "./project-root";

function isConstAssertion(node: TsAsExpressionNode): boolean {
  const typeAnnotation = node.typeAnnotation;
  return (
    typeAnnotation?.type === "TSTypeReference" &&
    typeAnnotation.typeName?.type === "Identifier" &&
    typeAnnotation.typeName.name === "const"
  );
}

/** True when a property's value is exactly what an enum member's initializer allows. */
function isEnumConvertibleProperty(property: ESTree.Property | ESTree.SpreadElement): boolean {
  if (property.type !== "Property" || property.computed) return false;
  const { value } = property;
  return value.type === "Literal" && (typeof value.value === "string" || typeof value.value === "number");
}

function isEnumLiteralType(node: TsTypeNode): boolean {
  if (node.type !== "TSLiteralType") return false;
  const value = node.literal?.value;
  return typeof value === "string" || typeof value === "number";
}

function isEnumLiteralUnion(node: TsTypeNode | undefined): boolean {
  return node?.type === "TSUnionType" && (node.types?.length ?? 0) >= 2 && (node.types ?? []).every(isEnumLiteralType);
}

function isZodCall(node: Pick<ESTree.CallExpression, "callee"> | CallExpressionNode, method: string): boolean {
  const { callee } = node;
  return (
    callee?.type === "MemberExpression" &&
    !callee.computed &&
    callee.object.type === "Identifier" &&
    callee.object.name === "z" &&
    callee.property.type === "Identifier" &&
    callee.property.name === method
  );
}

function propertyName(property: ESTree.Property): string | undefined {
  if (property.computed) return undefined;
  if (property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal" && typeof property.key.value === "string") return property.key.value;
  return undefined;
}

function rawZodDiscriminantLiteral(
  schemaCall: ESTree.CallExpression,
  discriminator: string,
): ESTree.Literal | undefined {
  if (!isZodCall(schemaCall, "object")) return undefined;

  const shape = schemaCall.arguments[0];
  if (shape?.type !== "ObjectExpression") return undefined;

  for (const property of shape.properties) {
    if (property.type !== "Property" || propertyName(property) !== discriminator) continue;
    if (property.value.type !== "CallExpression" || !isZodCall(property.value, "literal")) return undefined;

    const literal = property.value.arguments[0];
    if (literal?.type === "Literal" && (typeof literal.value === "string" || typeof literal.value === "number")) {
      return literal;
    }

    return undefined;
  }

  return undefined;
}

/**
 * A const tuple is a domain-enum substitute only when it is used to declare
 * a named Zod enum or a named indexed-access union. Ordinary tuples (ordering,
 * UI options, data rows) are intentionally not banned.
 */
function isLiteralTupleAssertion(node: TsAsExpressionNode): boolean {
  if (!isConstAssertion(node)) return false;
  const expression = node.expression;
  if (expression?.type !== "ArrayExpression" || expression.elements.length < 2) return false;
  const values = expression.elements.map((element) => {
    if (element?.type !== "Literal") return undefined;
    return typeof element.value === "string" || typeof element.value === "number" ? element.value : undefined;
  });
  return values.every((value) => value !== undefined) && new Set(values).size >= 2;
}

function isTsLiteralTupleDeclaration(declaration: ts.Declaration): boolean {
  if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) return false;
  const init = declaration.initializer;
  if (
    !ts.isAsExpression(init) ||
    !ts.isTypeReferenceNode(init.type) ||
    !ts.isIdentifier(init.type.typeName) ||
    init.type.typeName.text !== "const" ||
    !ts.isArrayLiteralExpression(init.expression) ||
    init.expression.elements.length < 2
  ) {
    return false;
  }
  const values = init.expression.elements.map((element) =>
    ts.isStringLiteral(element) || ts.isNumericLiteral(element) ? element.text : undefined,
  );
  return values.every((value) => value !== undefined) && new Set(values).size >= 2;
}

/** Identify members of an explicitly named closed domain, not merely a shared topic. */
const enumDomainPattern =
  /^(?<domain>[a-z][A-Za-z0-9]*?(?:Status|State|Mode|Kind|Type|Variant|Category|Phase|Level|Direction|Format|Outcome|Reason))(?<member>[A-Z][A-Za-z0-9]*)$/;

/** Valid HTML tags are provided by the TypeScript program, including lib.dom declarations. */
const htmlTagPattern = /^(?<member>[a-z][A-Za-z0-9]*?)(?:TagName|Tag)$/;
const programDomainsCache = new WeakMap<ts.Program, Set<string>>();
const htmlTagCache = new WeakMap<ts.Program, ReadonlySet<string>>();
const cssKeywordCache = new Map<string, ReadonlySet<string>>();

function htmlTagNamesFor(program: ts.Program): ReadonlySet<string> {
  const cached = htmlTagCache.get(program);
  if (cached) return cached;
  const source = program.getSourceFiles().find((file) => !file.isDeclarationFile);
  const checker = program.getTypeChecker();
  const symbol = source
    ? checker.getSymbolsInScope(source, ts.SymbolFlags.Interface).find((item) => item.name === "HTMLElementTagNameMap")
    : undefined;
  const tags = new Set(
    symbol
      ? checker
          .getDeclaredTypeOfSymbol(symbol)
          .getProperties()
          .map((property) => property.name)
      : [],
  );
  htmlTagCache.set(program, tags);
  return tags;
}

/** Collect grammar-declared CSS keywords, even when a property also accepts functions or arbitrary values. */
function cssKeywordsFor(property: string): ReadonlySet<string> {
  const cached = cssKeywordCache.get(property);
  if (cached) return cached;
  const keywords = new Set<string>();
  const visitedTypes = new Set<string>();
  const visitedProperties = new Set<string>([property]);
  const syntax = lexer.getProperty(property)?.syntax;
  function collect(node: Parameters<typeof definitionSyntax.walk>[0]): void {
    definitionSyntax.walk(node, (part) => {
      if (part.type === "Keyword") {
        keywords.add(part.name.toLowerCase());
      } else if (part.type === "Type") {
        if (visitedTypes.has(part.name)) return;
        visitedTypes.add(part.name);
        const nested = lexer.getType(part.name)?.syntax;
        if (nested) collect(nested);
      } else if (part.type === "Property") {
        if (visitedProperties.has(part.name)) return;
        visitedProperties.add(part.name);
        const nested = lexer.getProperty(part.name)?.syntax;
        if (nested) collect(nested);
      }
    });
  }
  if (syntax) collect(syntax);
  const result = keywords;
  cssKeywordCache.set(property, result);
  return result;
}

function normalized(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

/**
 * A one-member enum is valid only when its members belong to verified named
 * platform keyword choices, even if the property also permits arbitrary values.
 * CSS keywords come from css-tree; HTML tags come from the TS DOM declaration.
 */
export function isPlatformPropertyEnum(
  enumName: string,
  members: readonly { name: string; value: string | number }[],
  program?: ts.Program,
): boolean {
  if (members.length === 0 || members.some((member) => typeof member.value !== "string")) return false;
  if (enumName === "HtmlTagEnum") {
    if (!program) return false;
    const htmlTags = htmlTagNamesFor(program);
    return (
      htmlTags.size > 1 &&
      members.every(
        (member) => htmlTags.has(String(member.value)) && normalized(member.name) === normalized(String(member.value)),
      )
    );
  }

  const cssPropertyName = /^Css(?<property>[A-Z][A-Za-z0-9]*)Enum$/.exec(enumName)?.groups?.property;
  if (!cssPropertyName) return false;
  const property = cssPropertyName.replace(
    /[A-Z]/g,
    (part, index: number) => `${index ? "-" : ""}${part.toLowerCase()}`,
  );
  const keywords = cssKeywordsFor(property);
  if (keywords.size < 2) return false;
  return members.every(
    (member) =>
      keywords.has(String(member.value).toLowerCase()) &&
      normalized(member.name) === normalized(String(member.value)) &&
      Boolean(lexer.matchProperty(property, parse(String(member.value), { context: "value" })).matched),
  );
}

function isPlatformDomain(domain: string): boolean {
  return domain === "HtmlTag" || /^Css[A-Z]/.test(domain);
}

function cssDomain(name: string, value: string): string | undefined {
  // The property may precede or follow the keyword: positionRelative / absolutePosition.
  for (const match of name.matchAll(/[A-Z]/g)) {
    const boundary = match.index;
    const left = name.slice(0, boundary);
    const right = name.slice(boundary);
    const candidates: [string, string][] = [
      [left, right],
      [right, left],
    ];
    for (const [cssPropertyName, memberName] of candidates) {
      if (normalized(memberName) !== normalized(value)) continue;
      const property = cssPropertyName.replace(/[A-Z]/g, (part) => `-${part.toLowerCase()}`).replace(/^-/, "");
      if (!lexer.getProperty(property) || !cssKeywordsFor(property).has(value.toLowerCase())) continue;
      if (!lexer.matchProperty(property, parse(value, { context: "value" })).matched) continue;
      return `Css${cssPropertyName.charAt(0).toUpperCase()}${cssPropertyName.slice(1)}`;
    }
  }
  return undefined;
}

function inferredDomain(name: string, value: string | number, htmlTags: ReadonlySet<string>): string | undefined {
  if (typeof value === "string") {
    const tag = htmlTagPattern.exec(name)?.groups?.member;
    if (tag && normalized(tag) === normalized(value) && htmlTags.has(value)) return "HtmlTag";
    const css = cssDomain(name, value);
    if (css) return css;
    // A bare named CSS color is a member of the shared <color> keyword domain.
    if (
      normalized(name) === normalized(value) &&
      cssKeywordsFor("color").has(value.toLowerCase()) &&
      lexer.matchType("color", parse(value, { context: "value" })).matched
    ) {
      return "CssColor";
    }
    // Default names still identify a property when the value is a proven keyword.
    const defaultProperty = /^default(?<property>[A-Z][A-Za-z0-9]*)$/.exec(name)?.groups?.property;
    if (defaultProperty) {
      const propertyDomain = cssPropertyDomain(
        defaultProperty.charAt(0).toLowerCase() + defaultProperty.slice(1),
        value,
      );
      if (propertyDomain) return propertyDomain;
    }
  }

  const match = enumDomainPattern.exec(name);
  if (!match) return undefined;
  const member = match.groups?.member;
  const domain = match.groups?.domain;
  if (!member || !domain) return undefined;
  // A string alternative should describe its member; numeric codes need a single-word member.
  if (typeof value === "string") {
    if (normalized(value) !== normalized(member)) return undefined;
  } else if (!/^[A-Z][a-z0-9]*$/.test(member)) {
    return undefined;
  }
  return domain;
}

function cssPropertyDomain(property: string, value: string): string | undefined {
  const cssProperty = property.replace(/[A-Z]/g, (part) => `-${part.toLowerCase()}`).replace(/^-/, "");
  const keywords = cssKeywordsFor(cssProperty);
  if (keywords.size < 2 || !keywords.has(value.toLowerCase())) return undefined;
  if (!lexer.matchProperty(cssProperty, parse(value, { context: "value" })).matched) return undefined;
  return `Css${property.charAt(0).toUpperCase()}${property.slice(1)}`;
}

function tsPropertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
}

function identifierExpression(expression: ts.Expression): ts.Identifier | undefined {
  let current = expression;
  while (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return ts.isIdentifier(current) ? current : undefined;
}

/** Require an actual CSS style context before interpreting generic constant names as keywords. */
function isCssStyleObject(object: ts.ObjectLiteralExpression): boolean {
  const parent = object.parent;
  if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)) {
    return ts.isIdentifier(parent.parent.name) && parent.parent.name.text === "style";
  }
  if (ts.isPropertyAssignment(parent)) return tsPropertyName(parent.name) === "style";
  if (ts.isVariableDeclaration(parent) && parent.type) {
    return /(?:^|\.)CSSProperties\b|CSSStyleDeclaration\b/.test(parent.type.getText());
  }
  if (ts.isAsExpression(parent) || ts.isSatisfiesExpression(parent)) {
    return /(?:^|\.)CSSProperties\b|CSSStyleDeclaration\b/.test(parent.type.getText());
  }
  return false;
}

export function namedProgramDomains(program: ts.Program, sourceRoot: string): Set<string> {
  const cached = programDomainsCache.get(program);
  if (cached) return cached;
  const groups = new Map<string, { file: string; name: string; value: string | number }[]>();
  const checker = program.getTypeChecker();
  const declarations = new Map<ts.Symbol, { file: string; name: string; value: string | number; scope: string }>();
  function addGroup(
    scope: string,
    domain: string,
    member: { file: string; name: string; value: string | number },
  ): void {
    const key = `${scope}:${domain}`;
    const members = groups.get(key) ?? [];
    if (!members.some((existing) => existing.file === member.file && existing.name === member.name)) {
      members.push(member);
      groups.set(key, members);
    }
  }
  const htmlTags = htmlTagNamesFor(program);
  const root = sourceRoot + path.sep;
  for (const source of program.getSourceFiles()) {
    const file = path.resolve(source.fileName);
    if (source.isDeclarationFile || !file.startsWith(root) || /\.(?:test|spec|mock)\.[jt]sx?$/.test(file)) continue;
    const pieces = file.slice(root.length).split(path.sep);
    const scope = pieces[0] === "features" && pieces[1] ? pieces.slice(0, 2).join("/") : (pieces[0] ?? "src");
    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement) || statement.declarationList.flags !== ts.NodeFlags.Const) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        const name = declaration.name.text;
        let init: ts.Expression = declaration.initializer;
        while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init) || ts.isSatisfiesExpression(init)) {
          init = init.expression;
        }
        let value: string | number | undefined;
        if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) value = init.text;
        else if (ts.isNumericLiteral(init)) value = Number(init.text);
        if (value === undefined) continue;
        const symbol = checker.getSymbolAtLocation(declaration.name);
        if (symbol) declarations.set(symbol, { file, name, value, scope });
        const domain = inferredDomain(name, value, htmlTags);
        if (domain) addGroup(scope, domain, { file, name, value });
      }
    }
  }
  function recordCssUse(identifier: ts.Identifier, property: string): void {
    const symbol = checker.getSymbolAtLocation(identifier);
    if (!symbol) return;
    const original = symbol.flags === ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const declaration = declarations.get(original);
    if (!declaration || typeof declaration.value !== "string") return;
    const domain = cssPropertyDomain(property, declaration.value);
    if (domain) addGroup(declaration.scope, domain, declaration);
  }

  for (const source of program.getSourceFiles()) {
    const file = path.resolve(source.fileName);
    if (source.isDeclarationFile || !file.startsWith(root) || /\.(?:test|spec|mock)\.[jt]sx?$/.test(file)) continue;
    function visit(node: ts.Node): void {
      if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.parent) && isCssStyleObject(node.parent)) {
        const name = tsPropertyName(node.name);
        const identifier = identifierExpression(node.initializer);
        if (name && identifier) recordCssUse(identifier, name);
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isPropertyAccessExpression(node.left) &&
        ts.isPropertyAccessExpression(node.left.expression) &&
        node.left.expression.name.text === "style"
      ) {
        const identifier = identifierExpression(node.right);
        if (identifier) recordCssUse(identifier, node.left.name.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }

  const result = new Set<string>();
  for (const [key, members] of groups) {
    const platformDomain = isPlatformDomain(key.slice(key.indexOf(":") + 1));
    if (
      !platformDomain &&
      (new Set(members.map((m) => m.name)).size < 2 || new Set(members.map((m) => m.value)).size < 2)
    ) {
      continue;
    }
    for (const m of members) result.add(`${m.file}:${m.name}`);
  }
  for (const member of semanticZodEnumMembers(program, sourceRoot)) result.add(member);
  programDomainsCache.set(program, result);
  return result;
}

export const preferEnumRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require fixed sets of named string/number values to be TypeScript enums, including named Zod enum tuples and discriminated-union discriminator values.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};

    const objectSchemas = new Map<string, ESTree.CallExpression>();
    const literalTuples = new Set<string>();
    const enumTupleUses: { name: ESTree.Identifier; node: Rule.Node }[] = [];
    const discriminatedUnions: CallExpressionNode[] = [];
    const reportedDiscriminants = new Set<ESTree.Literal>();
    const services = typedParserServices(context.sourceCode.parserServices);
    const htmlTags = services ? htmlTagNamesFor(services.program) : new Set<string>();
    const namedLocals = new Map<string, { node: VariableDeclaratorNode; name: string; value: string | number }[]>();
    const genericNamedLocals = new Map<string, VariableDeclaratorNode>();

    function isTupleDomain(name: ESTree.Identifier): boolean {
      // The typed resolver follows imports and lexical shadowing. The local
      // name index is only a fallback for files linted without a TS program.
      if (!services) return literalTuples.has(name.name);

      const tsNode = services.esTreeNodeToTSNodeMap.get(name);
      if (!tsNode) return false;
      const checker = services.program.getTypeChecker();
      const symbol = checker.getSymbolAtLocation(tsNode);
      if (!symbol) return false;
      const original = symbol.flags === ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      return (original.declarations ?? []).some(isTsLiteralTupleDeclaration);
    }

    return {
      VariableDeclarator(node: VariableDeclaratorNode) {
        const { id, init } = node;
        if (id?.type !== "Identifier" || !init) return;
        const value =
          init.type === "Literal" && (typeof init.value === "string" || typeof init.value === "number")
            ? init.value
            : undefined;
        const domain = value === undefined ? undefined : inferredDomain(id.name, value, htmlTags);
        const declaration = node.parent;
        const owner = declaration?.parent;
        const moduleConst =
          declaration?.type === "VariableDeclaration" &&
          declaration.kind === "const" &&
          (owner?.type === "Program" || (owner?.type === "ExportNamedDeclaration" && owner.parent.type === "Program"));
        if (domain && value !== undefined && moduleConst) {
          const members = namedLocals.get(domain) ?? [];
          members.push({ node, name: id.name, value });
          namedLocals.set(domain, members);
        } else if (value !== undefined && moduleConst) {
          genericNamedLocals.set(id.name, node);
        }

        if (init.type === "CallExpression" && isZodCall(init, "object")) {
          objectSchemas.set(id.name, init);
        }
      },
      CallExpression(node: CallExpressionNode) {
        if (isZodCall(node, "discriminatedUnion")) {
          discriminatedUnions.push(node);
        }
        const argument = node.arguments?.[0];
        if (isZodCall(node, "enum") && argument?.type === "Identifier") {
          enumTupleUses.push({ name: argument, node });
        }
        // CVA option values are a closed domain, unlike structural dimension
        // names (size/tone) or the built-in boolean true/false keys.
        if (node.callee?.type === "Identifier" && node.callee.name === "cva") {
          const config = node.arguments?.[1];
          if (config?.type !== "ObjectExpression") return;
          const variants = config.properties.find(
            (entry) => entry.type === "Property" && propertyName(entry) === "variants",
          );
          if (variants?.type !== "Property" || variants.value.type !== "ObjectExpression") return;
          for (const dimension of variants.value.properties) {
            if (dimension.type !== "Property" || dimension.value.type !== "ObjectExpression") continue;
            const choices = dimension.value.properties;
            if (choices.length < 2 || choices.some((choice) => choice.type !== "Property")) continue;
            // A dynamic computed key makes the domain unprovable. Computed
            // member keys (typically Enum.Member) are already named choices.
            if (
              choices.some(
                (choice) => choice.type === "Property" && choice.computed && choice.key.type !== "MemberExpression",
              )
            ) {
              continue;
            }
            const rawChoices = choices.filter(
              (choice): choice is ESTree.Property => choice.type === "Property" && !choice.computed,
            );
            const names = rawChoices.map(propertyName);
            if (choices.length === 2 && names.length === 2 && names.includes("true") && names.includes("false")) {
              continue;
            }
            for (const choice of rawChoices) {
              if (!propertyName(choice)) continue;
              context.report({
                node: choice.key,
                message:
                  "A named CVA choice in a fixed set must use a TypeScript enum member as its key. See docs/next-codebase-guide/rules/constants-rule.md",
              });
            }
          }
        }
      },
      TSIndexedAccessType(node: TsIndexedAccessTypeNode) {
        const { objectType, indexType } = node;
        if (
          objectType?.type === "TSTypeQuery" &&
          objectType.exprName?.type === "Identifier" &&
          indexType?.type === "TSNumberKeyword"
        ) {
          enumTupleUses.push({ name: objectType.exprName, node });
        }
      },
      "Program:exit"() {
        const projectDomains = services ? namedProgramDomains(services.program, sourceRoot) : undefined;
        const semanticMembers = services ? semanticZodEnumMembers(services.program, sourceRoot) : undefined;
        for (const [domain, members] of namedLocals) {
          const localClosedSet =
            (isPlatformDomain(domain) && members.length > 0) ||
            (members.length >= 2 && new Set(members.map((m) => m.value)).size >= 2);
          for (const member of members) {
            if (!localClosedSet && !projectDomains?.has(`${filename}:${member.name}`)) continue;
            context.report({
              node: member.node,
              message: `Related named constants in the ${
                domain
              } domain must be members of one TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md`,
            });
          }
        }

        for (const [name, node] of genericNamedLocals) {
          const key = `${filename}:${name}`;
          if (!projectDomains?.has(key)) continue;
          context.report({
            node,
            message: semanticMembers?.has(key)
              ? "Constants used as alternatives in a Zod enum must be members of one TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md"
              : "A named CSS keyword must use its property-specific enum; different CSS properties must not share one generic constant. See docs/next-codebase-guide/rules/constants-rule.md",
          });
        }

        const reportedTuples = new Set<string>();
        for (const use of enumTupleUses) {
          if (reportedTuples.has(use.name.name) || !isTupleDomain(use.name)) continue;
          reportedTuples.add(use.name.name);
          context.report({
            node: use.node,
            message:
              "A const tuple used as a named enum domain must be replaced with a TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md",
          });
        }

        for (const unionCall of discriminatedUnions) {
          const [discriminatorArg, optionsArg] = unionCall.arguments ?? [];
          if (
            discriminatorArg?.type !== "Literal" ||
            typeof discriminatorArg.value !== "string" ||
            optionsArg?.type !== "ArrayExpression" ||
            optionsArg.elements.length < 2
          ) {
            continue;
          }

          for (const option of optionsArg.elements) {
            if (!option || option.type === "SpreadElement") continue;

            let schemaCall: ESTree.CallExpression | undefined;
            if (option.type === "Identifier") {
              schemaCall = objectSchemas.get(option.name);
            } else if (option.type === "CallExpression" && isZodCall(option, "object")) {
              schemaCall = option;
            }
            if (!schemaCall) continue;

            const literal = rawZodDiscriminantLiteral(schemaCall, discriminatorArg.value);
            if (!literal || reportedDiscriminants.has(literal)) continue;

            reportedDiscriminants.add(literal);
            context.report({
              node: literal,
              message:
                "A Zod discriminated-union discriminator literal must use a TypeScript enum member. See docs/next-codebase-guide/rules/constants-rule.md",
            });
          }
        }
      },
      TSAsExpression(node: TsAsExpressionNode) {
        if (!isConstAssertion(node)) return;

        if (isLiteralTupleAssertion(node) && node.parent?.type === "VariableDeclarator") {
          const { id } = node.parent;
          if (id.type === "Identifier") literalTuples.add(id.name);
        }

        const expression = node.expression;
        if (!expression || expression.type !== "ObjectExpression") return;
        if (expression.properties.length < 2) return;
        if (!expression.properties.every(isEnumConvertibleProperty)) return;

        context.report({
          node,
          message:
            "A fixed set of named values must be a TypeScript enum, not an object literal marked as const. See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
      TSTypeAliasDeclaration(node: TsTypeAliasDeclarationNode) {
        if (node.typeParameters || !isEnumLiteralUnion(node.typeAnnotation)) return;

        context.report({
          node,
          message:
            "A named union made only of string or number literals must be a TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
      TSPropertySignature(node: TsPropertySignatureNode) {
        const typeAnnotation = node.typeAnnotation?.typeAnnotation;
        if (!isEnumLiteralUnion(typeAnnotation)) return;

        context.report({
          node,
          message:
            "A property whose type is a union made only of string or number literals must use a TypeScript enum. See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
    };
  },
};
