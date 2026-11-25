/**
 * ESLint rule: pasika/declaration-order.
 * Sort only declarations whose evaluation is independent and side-effect free.
 * Imports, comments, computed initializers and other executable statements are barriers.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { sourceRootOf } from "./project-root";

const MESSAGE =
  "Order independent declarations as types, enums, constants (alphabetically), functions, then local exports. See docs/next-codebase-guide/rules/constants-rule.md";

enum DeclarationKind {
  Type,
  Enum,
  Constant,
  Function,
  Export,
}

interface Entry {
  node: ts.Statement;
  kind: DeclarationKind;
  name: string;
}

function isIndependentLiteral(node: ts.Expression): boolean {
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)) return true;
  if (
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  ) {
    return true;
  }
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isSatisfiesExpression(node)
  ) {
    return isIndependentLiteral(node.expression);
  }
  if (ts.isPrefixUnaryExpression(node)) {
    return (
      (node.operator === ts.SyntaxKind.PlusToken || node.operator === ts.SyntaxKind.MinusToken) &&
      ts.isNumericLiteral(node.operand)
    );
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.every((element) => isIndependentLiteral(element));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.every(
      (property) =>
        ts.isPropertyAssignment(property) &&
        !ts.isComputedPropertyName(property.name) &&
        isIndependentLiteral(property.initializer),
    );
  }
  return false;
}

function entryFor(node: ts.Statement, overloadedNames: ReadonlySet<string>): Entry | undefined {
  if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
    return { node, kind: DeclarationKind.Type, name: node.name.text };
  }
  if (
    ts.isEnumDeclaration(node) &&
    node.members.every(
      (member) =>
        !ts.isComputedPropertyName(member.name) && (!member.initializer || isIndependentLiteral(member.initializer)),
    )
  ) {
    return { node, kind: DeclarationKind.Enum, name: node.name.text };
  }
  if (ts.isVariableStatement(node) && node.declarationList.flags === ts.NodeFlags.Const) {
    const [declaration] = node.declarationList.declarations;
    if (
      node.declarationList.declarations.length === 1 &&
      declaration &&
      ts.isIdentifier(declaration.name) &&
      declaration.initializer &&
      isIndependentLiteral(declaration.initializer)
    ) {
      return { node, kind: DeclarationKind.Constant, name: declaration.name.text };
    }
  }
  if (ts.isFunctionDeclaration(node) && node.body && node.name && !overloadedNames.has(node.name.text)) {
    return { node, kind: DeclarationKind.Function, name: node.name.text };
  }
  if (
    ts.isExportDeclaration(node) &&
    !node.moduleSpecifier &&
    node.exportClause &&
    ts.isNamedExports(node.exportClause)
  ) {
    return { node, kind: DeclarationKind.Export, name: "" };
  }
  return undefined;
}

function compareEntries(first: Entry, second: Entry): number {
  if (first.kind !== second.kind) return first.kind - second.kind;
  if (first.kind !== DeclarationKind.Constant || first.name === second.name) return 0;
  return first.name < second.name ? -1 : 1;
}

function checkGroup(context: Rule.RuleContext, file: ts.SourceFile, group: readonly Entry[]): void {
  if (group.length < 2) return;
  const ordered = [...group].sort(compareEntries);
  if (ordered.every((entry, index) => entry === group[index])) return;
  const first = group[0];
  const last = group[group.length - 1];
  if (!first || !last) return;
  const start = first.node.getStart(file);
  const end = last.node.getEnd();
  const source = context.sourceCode;
  const newline = source.text.includes("\r\n") ? "\r\n" : "\n";
  const replacement = ordered
    .map((entry, index) => {
      const previous = ordered[index - 1];
      const separator = previous?.kind === entry.kind ? newline : newline + newline;
      return (index === 0 ? "" : separator) + source.text.slice(entry.node.getStart(file), entry.node.getEnd());
    })
    .join("");
  context.report({
    loc: { start: source.getLocFromIndex(start), end: source.getLocFromIndex(end) },
    message: MESSAGE,
    fix(fixer) {
      return fixer.replaceTextRange([start, end], replacement);
    },
  });
}

export const declarationOrderRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "layout",
    fixable: "code",
    docs: { description: "Order safely movable module declarations and alphabetize independent literal constants." },
  },
  create(context) {
    if (!path.resolve(context.filename).startsWith(sourceRootOf(context) + path.sep)) return {};
    return {
      Program() {
        const source = context.sourceCode;
        const file = ts.createSourceFile(context.filename, source.text, ts.ScriptTarget.Latest, false);
        const comments = source.getAllComments();
        const overloadedNames = new Set(
          file.statements.flatMap((node) =>
            ts.isFunctionDeclaration(node) && !node.body && node.name ? [node.name.text] : [],
          ),
        );
        let group: Entry[] = [];
        for (const [index, node] of file.statements.entries()) {
          const previous = file.statements[index - 1];
          const next = file.statements[index + 1];
          const start = previous?.getEnd() ?? 0;
          const end = next?.getStart(file) ?? source.text.length;
          // Pin both sides of a comment: it may document either declaration.
          const hasComment = comments.some(
            (comment) => comment.range && comment.range[0] >= start && comment.range[1] <= end,
          );
          const entry = hasComment ? undefined : entryFor(node, overloadedNames);
          if (!entry) {
            checkGroup(context, file, group);
            group = [];
            continue;
          }
          group.push(entry);
        }
        checkGroup(context, file, group);
      },
    };
  },
};
