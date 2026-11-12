/**
 * ESLint rule: pasika/no-unused-style-exports
 *
 * Unused exported static class strings in application components are dead
 * styling APIs. This is deliberately limited to *ClassName declarations in
 * TSX modules; local styling constants and externally consumed exports remain.
 *
 * @see docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { getProjectIndex, symbolKey } from "../project/index";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-tailwind-guide/rules/tailwind-class-reuse-rule.md";

function isApplication(sourceRoot: string): boolean {
  try {
    const manifest: unknown = JSON.parse(readFileSync(path.resolve(sourceRoot, "..", "package.json"), "utf8"));
    return !(typeof manifest === "object" && manifest !== null && "exports" in manifest);
  } catch {
    return true;
  }
}

function staticClasses(node: ts.Expression): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node)) return staticClasses(node.expression);
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return undefined;
  if (node.expression.text !== "cn" && node.expression.text !== "clsx") return undefined;
  const parts: string[] = [];
  for (const argument of node.arguments) {
    if (ts.isSpreadElement(argument)) return undefined;
    const part = staticClasses(argument);
    if (part === undefined) return undefined;
    parts.push(part);
  }
  return parts.join(" ");
}

export const noUnusedStyleExportsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Remove unused exported class-name constants from application components." },
  },
  create(context) {
    const file = path.resolve(context.filename);
    if (!file.endsWith(".tsx") || /\.(?:test|spec)\.tsx$/u.test(file)) return {};
    const sourceRoot = sourceRootOf(context);
    if (!isApplication(sourceRoot)) return {};
    const index = getProjectIndex(sourceRoot);
    // A styling-only TSX helper is not itself a component; do not police its API.
    if (!index?.modules.get(file)?.exports.some((item) => item.kind === "component")) return {};

    return {
      Program() {
        const source = ts.createSourceFile(
          file,
          context.sourceCode.text,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
        const identifiers = new Map<string, number>();
        const visit = (node: ts.Node): void => {
          if (ts.isIdentifier(node)) identifiers.set(node.text, (identifiers.get(node.text) ?? 0) + 1);
          ts.forEachChild(node, visit);
        };
        visit(source);

        for (const statement of source.statements) {
          if (!ts.isVariableStatement(statement)) continue;
          if (!(ts.getModifiers(statement) ?? []).some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) continue;
          for (const declaration of statement.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
            const name = declaration.name.text;
            if (!name.endsWith("ClassName")) continue;
            const classes = staticClasses(declaration.initializer);
            if (!classes?.trim()) continue;
            if ((identifiers.get(name) ?? 0) > 1) continue;
            if (index.symbolConsumers.get(symbolKey(file, name))?.size) continue;
            const location = source.getLineAndCharacterOfPosition(declaration.name.getStart(source));
            context.report({
              loc: { line: location.line + 1, column: location.character },
              message: `Unused exported styling constant "${name}" in an application component. Remove the export or consume the styling. ${DOC}`,
            });
          }
        }
      },
    };
  },
};
