/**
 * ESLint rule: pasika/no-unused-app-exports
 *
 * Static project-wide checks for unused internal application exports.
 * Local bindings/imports are handled by the host TypeScript/ESLint checks.
 * Framework entry points and publicly exported packages are not internal APIs.
 *
 * @see docs/next-codebase-guide/rules/dead-code-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { getProjectIndex, symbolKey } from "../project/index";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-codebase-guide/rules/dead-code-rule.md";

function isApplication(sourceRoot: string): boolean {
  try {
    const manifest: unknown = JSON.parse(readFileSync(path.resolve(sourceRoot, "..", "package.json"), "utf8"));
    return !(typeof manifest === "object" && manifest !== null && "exports" in manifest);
  } catch {
    return true;
  }
}

function isInternalFile(file: string, sourceRoot: string): boolean {
  if (!/\.[cm]?[jt]sx?$/u.test(file) || /\.(?:test|spec|stories)\.[jt]sx?$/u.test(file)) return false;
  const relative = path.relative(sourceRoot, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  const segments = relative.split(path.sep);
  if (segments[0] === "app" || segments[0] === "pages") return false;
  if (segments.length === 1 && /^(?:instrumentation|middleware|proxy|index)\.[jt]sx?$/u.test(segments[0] ?? "")) {
    return false;
  }
  return true;
}

interface Candidate {
  name: string;
  exportedAs: string;
  node: ts.Node;
}

function exportedDeclarations(source: ts.SourceFile): Candidate[] {
  const result: Candidate[] = [];
  const localTypes = new Set(
    source.statements
      .filter(
        (statement): statement is ts.TypeAliasDeclaration | ts.InterfaceDeclaration =>
          ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement),
      )
      .map((statement) => statement.name.text),
  );
  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause) && !statement.isTypeOnly) {
        for (const element of statement.exportClause.elements) {
          if (element.isTypeOnly || localTypes.has(element.propertyName?.text ?? element.name.text)) continue;
          result.push({
            name: element.propertyName?.text ?? element.name.text,
            exportedAs: element.name.text,
            node: element.name,
          });
        }
      }
      continue;
    }
    if (!ts.canHaveModifiers(statement)) continue;
    const modifiers = ts.getModifiers(statement) ?? [];
    if (!modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) continue;

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          result.push({ name: declaration.name.text, exportedAs: declaration.name.text, node: declaration.name });
        }
      }
    } else if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      result.push({ name: statement.name.text, exportedAs: statement.name.text, node: statement.name });
    }
    // Types and schemas have dedicated extraction/ownership rules.
  }
  return result;
}

export const noUnusedAppExportsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Remove unused internal application exports regardless of their type or naming." },
  },
  create(context) {
    const file = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!isInternalFile(file, sourceRoot) || !isApplication(sourceRoot)) return {};
    const index = getProjectIndex(sourceRoot);
    if (!index?.modules.has(file)) return {};

    return {
      Program() {
        const source = ts.createSourceFile(
          file,
          context.sourceCode.text,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        );
        const candidates = exportedDeclarations(source);
        if (candidates.length === 0) return;

        // Only a declaration's own name occurrence is ignored. A second
        // identifier in the same file conservatively counts as a local use.
        const occurrences = new Map<string, number>();
        const visit = (node: ts.Node): void => {
          if (ts.isIdentifier(node)) occurrences.set(node.text, (occurrences.get(node.text) ?? 0) + 1);
          ts.forEachChild(node, visit);
        };
        visit(source);

        for (const candidate of candidates) {
          // Types/schemas are already governed by type-extraction.
          const kind = index.modules.get(file)?.exports.find((item) => item.name === candidate.exportedAs)?.kind;
          if (kind === "type" || kind === "schema") continue;
          if (index.symbolConsumers.get(symbolKey(file, candidate.exportedAs))?.size) continue;
          const localUses = (occurrences.get(candidate.name) ?? 0) > 1;
          const position = source.getLineAndCharacterOfPosition(candidate.node.getStart(source));
          context.report({
            loc: { line: position.line + 1, column: position.character },
            message: localUses
              ? `Unused application export "${candidate.exportedAs}": it has no external consumers. Keep the declaration private. ${DOC}`
              : `Dead application export "${candidate.exportedAs}": it has no consumers. Remove it. ${DOC}`,
          });
        }
      },
    };
  },
};
