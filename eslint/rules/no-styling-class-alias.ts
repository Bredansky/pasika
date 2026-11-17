/**
 * ESLint rule: pasika/no-styling-class-alias
 *
 * Class-name enums and shared string constants are documentation metadata at
 * most: styling must own its Tailwind utilities at the JSX/cn/CVA use site.
 * An enum used only for display text is intentionally allowed.
 *
 * @see docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { resolveSpecifier } from "../project/index";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md";
const MESSAGE = `Do not use enum members or shared class-name constants to style elements; keep Tailwind classes at the JSX/cn/CVA use site or extract a component. ${DOC}`;

interface Binding {
  kind: "enum" | "const";
  origin: string;
  exported?: boolean;
  members?: Set<string>;
}

function isStaticString(expression: ts.Expression | undefined): boolean {
  if (!expression) return false;
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return true;
  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return isStaticString(expression.expression);
  }
  return false;
}

function isProductionFile(file: string, root: string): boolean {
  return (
    file.startsWith(root + path.sep) && /\.[cm]?[jt]sx?$/.test(file) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)
  );
}

export const noStylingClassAliasRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Do not style JSX or cn/CVA compositions through enum members or shared class-name constants.",
    },
  },
  create(context) {
    const root = sourceRootOf(context);
    const file = path.resolve(context.filename);
    if (!isProductionFile(file, root)) return {};

    const current = ts.createSourceFile(file, context.sourceCode.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const sourceCache = new Map<string, ts.SourceFile | undefined>([[file, current]]);
    const lookupCache = new Map<string, Binding | undefined>();
    const visited = new Set<string>();

    function loadSource(target: string): ts.SourceFile | undefined {
      if (sourceCache.has(target)) return sourceCache.get(target);
      let parsed: ts.SourceFile | undefined;
      try {
        parsed = ts.createSourceFile(
          target,
          readFileSync(target, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
      } catch {
        // Unresolved import: do not guess whether it is a styling alias.
      }
      sourceCache.set(target, parsed);
      return parsed;
    }

    function lookup(target: string, name: string): Binding | undefined {
      const key = `${target}\u0000${name}`;
      if (lookupCache.has(key)) return lookupCache.get(key);
      if (visited.has(key)) return undefined;
      visited.add(key);
      const source = loadSource(target);
      let found: Binding | undefined;

      for (const statement of source?.statements ?? []) {
        if (ts.isEnumDeclaration(statement) && statement.name.text === name) {
          found = {
            kind: "enum",
            origin: target,
            members: new Set(
              statement.members
                .filter((member) => isStaticString(member.initializer))
                .map((member) => member.name.getText(source)),
            ),
          };
          break;
        }

        if (ts.isVariableStatement(statement)) {
          for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || declaration.name.text !== name) continue;
            if (isStaticString(declaration.initializer)) {
              const exported = (ts.getModifiers(statement) ?? []).some(
                (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
              );
              found = { kind: "const", origin: target, exported };
            }
            break;
          }
        }
        if (found) break;

        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
          const targetModule = resolveSpecifier(target, statement.moduleSpecifier.text, root);
          if (!targetModule) continue;
          const elements = statement.importClause?.namedBindings;
          if (!elements || !ts.isNamedImports(elements)) continue;
          for (const specifier of elements.elements) {
            if (specifier.name.text !== name || specifier.isTypeOnly) continue;
            found = lookup(targetModule, specifier.propertyName?.text ?? name);
            break;
          }
        }

        if (
          ts.isExportDeclaration(statement) &&
          statement.moduleSpecifier &&
          ts.isStringLiteral(statement.moduleSpecifier)
        ) {
          const targetModule = resolveSpecifier(target, statement.moduleSpecifier.text, root);
          if (!targetModule) continue;
          if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
            for (const specifier of statement.exportClause.elements) {
              if (specifier.name.text !== name || specifier.isTypeOnly) continue;
              found = lookup(targetModule, specifier.propertyName?.text ?? name);
              break;
            }
          } else if (!statement.exportClause) {
            found = lookup(targetModule, name);
          }
        }
        if (found) break;
      }

      visited.delete(key);
      lookupCache.set(key, found);
      return found;
    }

    const reported = new Set<number>();
    function report(node: ts.Node): void {
      const pos = node.getStart(current);
      if (reported.has(pos)) return;
      reported.add(pos);
      const location = current.getLineAndCharacterOfPosition(pos);
      context.report({
        node: context.sourceCode.ast,
        loc: { line: location.line + 1, column: location.character },
        message: MESSAGE,
      });
    }

    function inspectStyle(expression: ts.Node): void {
      if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
        const binding = lookup(file, expression.expression.text);
        if (binding?.kind === "enum" && binding.members?.has(expression.name.text)) {
          report(expression);
          return;
        }
      }
      if (ts.isIdentifier(expression)) {
        const binding = lookup(file, expression.text);
        if (binding?.kind === "const" && (binding.origin !== file || binding.exported)) {
          // Declarations under constants/ are already rejected by
          // no-inline-runtime-literal; avoid reporting them twice here.
          if (binding.origin !== file || !path.relative(root, file).split(path.sep).includes("constants")) {
            report(expression);
          }
          return;
        }
      }
      ts.forEachChild(expression, inspectStyle);
    }

    function visit(node: ts.Node): void {
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === "className") {
        if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
          inspectStyle(node.initializer.expression);
        }
        return;
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        ["cn", "clsx", "cva"].includes(node.expression.text)
      ) {
        for (const argument of node.arguments) inspectStyle(argument);
        return;
      }
      ts.forEachChild(node, visit);
    }
    return {
      Program() {
        visit(current);
      },
    };
  },
};
