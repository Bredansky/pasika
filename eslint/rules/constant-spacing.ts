/**
 * Shared helper for pasika/constant-casing
 *
 * Group single-line constants and separate multiline constants in constants modules.
 * Comments remain deliberate section boundaries.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import type { AST, Rule } from "eslint";

const MESSAGE =
  "Consecutive single-line const declarations in a constants module must not have blank lines between them. " +
  "See docs/next-codebase-guide/rules/constants-rule.md";

const MULTILINE_MESSAGE =
  "Multiline const declarations in a constants module must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";

const CONSTANTS_FILE = /(?:^|\/)src\/(?:[^/]+\/)*constants\/[^/]+\.[cm]?[jt]sx?$/u;
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

function spacing(gap: string, multiline: boolean): string {
  const newline = gap.includes("\r\n") ? "\r\n" : "\n";
  const indentation = /[\t ]*$/u.exec(gap)?.[0] ?? "";
  return (multiline ? newline + newline : newline) + indentation;
}

export function enforceConstantSpacing(context: Rule.RuleContext): void {
  const filename = context.filename.replaceAll("\\", "/");
  if (!CONSTANTS_FILE.test(filename)) return;
  const statements = context.sourceCode.ast.body;
  for (let index = 1; index < statements.length; index += 1) {
    const previous = statements[index - 1];
    const current = statements[index];
    if (!previous || !current) continue;

    const firstExported = constantDeclarationExported(previous);
    const secondExported = constantDeclarationExported(current);
    if (firstExported === undefined || secondExported === undefined) continue;
    const multiline =
      previous.loc?.start.line !== previous.loc?.end.line || current.loc?.start.line !== current.loc?.end.line;
    if (!multiline && firstExported !== secondExported) continue;

    const start = previous.range?.[1];
    const end = current.range?.[0];
    if (start === undefined || end === undefined) continue;
    const gap = context.sourceCode.text.slice(start, end);
    // Any comment acts as an explicit group boundary. Never touch it.
    if (gap.trim() || BLANK_LINE.test(gap) === multiline) continue;

    context.report({
      node: current,
      message: multiline ? MULTILINE_MESSAGE : MESSAGE,
      fix(fixer) {
        return fixer.replaceTextRange([start, end], spacing(gap, multiline));
      },
    });
  }
}
