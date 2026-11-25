/**
 * Shared helper for pasika/constant-casing
 *
 * Group single-line constants, separate multiline constants, and separate enums from constants in source modules.
 * Comments remain deliberate section boundaries.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import type { AST, Rule } from "eslint";

const MESSAGE =
  "Consecutive single-line const declarations must not have blank lines between them. " +
  "See docs/next-codebase-guide/rules/constants-rule.md";

const MULTILINE_MESSAGE =
  "Multiline const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";

const ENUM_MESSAGE =
  "Const and enum declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";

const BLANK_LINE = /\r?\n[\t ]*\r?\n/u;

function constantDeclarationExported(node: AST.Program["body"][number]): boolean | undefined {
  const exported = node.type === "ExportNamedDeclaration";
  const declaration = exported ? node.declaration : node;
  if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") return undefined;
  if (declaration.declarations.length !== 1) return undefined;
  const binding = declaration.declarations[0]?.id;
  if (binding?.type !== "Identifier") return undefined;
  return exported;
}

function isEnumDeclaration(node: AST.Program["body"][number]): boolean {
  const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
  const type: string | undefined = declaration?.type;
  return type === "TSEnumDeclaration";
}

function spacing(gap: string, multiline: boolean): string {
  const newline = gap.includes("\r\n") ? "\r\n" : "\n";
  const indentation = /[\t ]*$/u.exec(gap)?.[0] ?? "";
  return (multiline ? newline + newline : newline) + indentation;
}

export function enforceConstantSpacing(context: Rule.RuleContext): void {
  const statements = context.sourceCode.ast.body;
  for (let index = 1; index < statements.length; index += 1) {
    const previous = statements[index - 1];
    const current = statements[index];
    if (!previous || !current) continue;

    const firstExported = constantDeclarationExported(previous);
    const secondExported = constantDeclarationExported(current);
    const enumBoundary =
      (firstExported !== undefined && isEnumDeclaration(current)) ||
      (secondExported !== undefined && isEnumDeclaration(previous));
    if (!enumBoundary && (firstExported === undefined || secondExported === undefined)) continue;
    const multiline =
      previous.loc?.start.line !== previous.loc?.end.line || current.loc?.start.line !== current.loc?.end.line;
    if (!enumBoundary && !multiline && firstExported !== secondExported) continue;
    const needsBlankLine = enumBoundary || multiline;

    const start = previous.range?.[1];
    const end = current.range?.[0];
    if (start === undefined || end === undefined) continue;
    const gap = context.sourceCode.text.slice(start, end);
    // Any comment acts as an explicit group boundary. Never touch it.
    if (gap.trim() || BLANK_LINE.test(gap) === needsBlankLine) continue;

    context.report({
      node: current,
      message: enumBoundary ? ENUM_MESSAGE : multiline ? MULTILINE_MESSAGE : MESSAGE,
      fix(fixer) {
        return fixer.replaceTextRange([start, end], spacing(gap, needsBlankLine));
      },
    });
  }
}
