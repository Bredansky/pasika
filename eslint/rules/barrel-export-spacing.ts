/**
 * Internal star re-export spacing helper for pasika/import-spacing.
 *
 * The import-spacing rule uses this scan for index barrels as well as imports.
 * Autofixes remove blank lines without changing the contents of comments.
 *
 * @see docs/next-codebase-guide/rules/exports-and-imports-rule.md
 */
import type { Rule } from "eslint";

const BARREL_NAME = /^index\.(?:[cm]?[jt]sx?)$/u;
const MESSAGE =
  "Consecutive star re-exports in an index barrel must not be separated by blank lines. " +
  "See docs/next-codebase-guide/rules/exports-and-imports-rule.md";

function compactBlankLines(text: string): string {
  return text.replace(/(?:\r?\n[\t ]*){2,}/gu, (match) => {
    const newline = match.includes("\r\n") ? "\r\n" : "\n";
    const indent = /[\t ]*$/u.exec(match)?.[0] ?? "";
    return newline + indent;
  });
}

export function enforceBarrelExportSpacing(context: Rule.RuleContext): void {
  const filename = context.filename.replaceAll("\\", "/");
  if (!BARREL_NAME.test(filename.slice(filename.lastIndexOf("/") + 1))) return;

  const statements = context.sourceCode.ast.body;
  const source = context.sourceCode.text;
  const comments = context.sourceCode.getAllComments();

  for (let index = 1; index < statements.length; index += 1) {
    const previous = statements[index - 1];
    const current = statements[index];
    if (previous?.type !== "ExportAllDeclaration" || current?.type !== "ExportAllDeclaration") continue;

    const start = previous.range?.[1];
    const end = current.range?.[0];
    if (start === undefined || end === undefined) continue;

    let cursor = start;
    let compacted = "";
    for (const comment of comments) {
      const commentStart = comment.range?.[0];
      const commentEnd = comment.range?.[1];
      if (commentStart === undefined || commentEnd === undefined || commentStart < cursor || commentEnd > end) {
        continue;
      }
      compacted += compactBlankLines(source.slice(cursor, commentStart));
      compacted += source.slice(commentStart, commentEnd);
      cursor = commentEnd;
    }
    compacted += compactBlankLines(source.slice(cursor, end));

    if (compacted === source.slice(start, end)) continue;
    context.report({
      node: current,
      message: MESSAGE,
      fix(fixer) {
        return fixer.replaceTextRange([start, end], compacted);
      },
    });
  }
}
