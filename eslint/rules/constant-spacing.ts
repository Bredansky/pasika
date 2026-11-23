/**
 * Shared helper for pasika/constant-casing
 *
 * Keep adjacent single-const declarations together in constants modules,
 * regardless of their identifier names. Comments, different declaration kinds,
 * and export visibility are deliberate section boundaries.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import type { AST, Rule } from "eslint";

const MESSAGE =
  "Consecutive const declarations in a constants module must not have blank lines between them. " +
  "See docs/next-codebase-guide/rules/constants-rule.md";

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

function compactBlankLines(gap: string): string {
  const newline = gap.includes("\r\n") ? "\r\n" : "\n";
  const indentation = /[\t ]*$/u.exec(gap)?.[0] ?? "";
  return newline + indentation;
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
    if (firstExported !== secondExported) continue;

    const start = previous.range?.[1];
    const end = current.range?.[0];
    if (start === undefined || end === undefined) continue;
    const gap = context.sourceCode.text.slice(start, end);
    // Any comment acts as an explicit group boundary. Never touch it.
    if (gap.trim() || !BLANK_LINE.test(gap)) continue;

    context.report({
      node: current,
      message: MESSAGE,
      fix(fixer) {
        return fixer.replaceTextRange([start, end], compactBlankLines(gap));
      },
    });
  }
}
