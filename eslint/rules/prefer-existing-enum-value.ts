/**
 * ESLint rule: pasika/prefer-existing-enum-value
 *
 * An already imported enum is the source of truth for column selectors and
 * local route paths. Only report uniquely identified enum members, avoiding
 * unrelated user-visible, third-party and test string literals.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { typedParserServices } from "./contract-ownership";
import { sourceRootOf } from "./project-root";

type EnumDomain = "column" | "route";
interface EnumMatch {
  reference: string;
  domain: EnumDomain;
}

const columnMethods = new Set([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "is",
  "in",
  "order",
  "filter",
  "not",
]);

function memberName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

function isWithin(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function domainOf(name: string): EnumDomain | undefined {
  if (name.endsWith("ColumnEnum")) return "column";
  if (name.endsWith("Route") || name.endsWith("RouteEnum")) return "route";
  return undefined;
}

function importedEnums(
  file: ts.SourceFile,
  checker: ts.TypeChecker,
  sourceRoot: string,
  importedNames: ReadonlySet<string>,
): Map<string, EnumMatch[]> {
  const matches = new Map<string, EnumMatch[]>();
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }

    for (const specifier of statement.importClause.namedBindings.elements) {
      if (!importedNames.has(specifier.name.text)) continue;
      const symbol = checker.getSymbolAtLocation(specifier.name);
      if (!symbol) continue;
      const resolved = symbol.flags === ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      for (const declaration of resolved.declarations ?? []) {
        if (!ts.isEnumDeclaration(declaration)) continue;
        if (!isWithin(sourceRoot, path.resolve(declaration.getSourceFile().fileName))) continue;
        const domain = domainOf(declaration.name.text);
        if (!domain) continue;
        for (const member of declaration.members) {
          const initializer = member.initializer;
          if (!initializer || !ts.isStringLiteral(initializer)) continue;
          const name = memberName(member.name);
          if (!name) continue;
          const entries = matches.get(initializer.text) ?? [];
          entries.push({ reference: `${specifier.name.text}.${name}`, domain });
          matches.set(initializer.text, entries);
        }
      }
    }
  }
  return matches;
}

function isPathname(node: ts.Expression): boolean {
  return ts.isPropertyAccessExpression(node) && node.name.text === "pathname";
}

function domainForUse(node: ts.StringLiteral): EnumDomain | undefined {
  const parent = node.parent;
  if (ts.isPropertyAssignment(parent) && parent.initializer === node && memberName(parent.name) === "path") {
    return "route";
  }
  if (ts.isCallExpression(parent) && parent.arguments[0] === node && ts.isPropertyAccessExpression(parent.expression)) {
    const { expression, name } = parent.expression;
    if (columnMethods.has(name.text)) return "column";
    if (name.text === "startsWith" && isPathname(expression)) return "route";
  }
  if (
    ts.isBinaryExpression(parent) &&
    (parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) &&
    ((parent.left === node && isPathname(parent.right)) || (parent.right === node && isPathname(parent.left)))
  ) {
    return "route";
  }
  return undefined;
}

export const preferExistingEnumValueRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Reuse imported enum members for database column selectors and local API route paths.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!isWithin(sourceRoot, filename) || /\.(?:test|spec|mock)\.[^.]+$/.test(filename)) return {};
    const services = typedParserServices(context.sourceCode.parserServices);
    if (!services) return {};
    const file = services.program.getSourceFile(filename);
    // TypeScript project-service programs may lag the text ESLint is linting.
    // Do not match imports from a stale source snapshot.
    if (file?.text !== context.sourceCode.text) return {};
    const importedNames = new Set<string>();
    for (const statement of context.sourceCode.ast.body) {
      if (statement.type !== "ImportDeclaration") continue;
      for (const specifier of statement.specifiers) {
        importedNames.add(specifier.local.name);
      }
    }
    if (importedNames.size === 0) return {};
    const matches = importedEnums(file, services.program.getTypeChecker(), sourceRoot, importedNames);
    if (matches.size === 0) return {};

    return {
      Program() {
        const visit = (node: ts.Node): void => {
          if (ts.isStringLiteral(node)) {
            const domain = domainForUse(node);
            const candidates = matches.get(node.text)?.filter((entry) => entry.domain === domain) ?? [];
            if (candidates.length === 1) {
              const match = candidates[0];
              if (match) {
                const position = file.getLineAndCharacterOfPosition(node.getStart(file));
                context.report({
                  loc: { line: position.line + 1, column: position.character },
                  message:
                    `Use ${match.reference} instead of the raw string "${node.text}" in this ${domain === "column" ? "column selector" : "route path"}. ` +
                    "See docs/next-codebase-guide/rules/constants-rule.md",
                });
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(file);
      },
    };
  },
};
