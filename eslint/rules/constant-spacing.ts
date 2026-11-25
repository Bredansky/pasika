/**
 * Declaration spacing shared by pasika/constant-casing.
 * Line wrapping is not a declaration boundary; comments remain intentional boundaries.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import type { AST, Rule } from "eslint";

const MESSAGE =
  "Consecutive const declarations must not have blank lines between them. See docs/next-codebase-guide/rules/constants-rule.md";
const BOUNDARY_MESSAGE =
  "Different declaration groups must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const BLANK_LINE = /\r?\n[\t ]*\r?\n/u;

type Statement = AST.Program["body"][number];
type Group = "import" | "type" | "enum" | "const" | "function" | "export";

function declarationGroup(node: Statement): Group | undefined {
  if (node.type === "ImportDeclaration") return "import";
  if (node.type === "ExportNamedDeclaration" && !node.declaration) {
    return node.source ? undefined : "export";
  }
  const declaration =
    node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration" ? node.declaration : node;
  const type: string | undefined = declaration?.type;
  if (type === "TSInterfaceDeclaration" || type === "TSTypeAliasDeclaration") return "type";
  if (type === "TSEnumDeclaration") return "enum";
  if (declaration?.type === "FunctionDeclaration") return "function";
  if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") return undefined;
  if (declaration.declarations.length !== 1 || declaration.declarations[0]?.id.type !== "Identifier") return undefined;
  return "const";
}

export function enforceConstantSpacing(context: Rule.RuleContext): void {
  const statements = context.sourceCode.ast.body;
  const source = context.sourceCode.text;
  for (let index = 1; index < statements.length; index += 1) {
    const previous = statements[index - 1];
    const current = statements[index];
    if (!previous || !current) continue;

    const first = declarationGroup(previous);
    const second = declarationGroup(current);
    if (!first || !second || (first === second && first !== "const")) continue;
    const needsBlankLine = first !== second;
    const start = previous.range?.[1];
    const end = current.range?.[0];
    if (start === undefined || end === undefined) continue;
    const gap = source.slice(start, end);
    if (gap.trim() || (BLANK_LINE.test(gap) === needsBlankLine && gap.includes("\n"))) continue;

    context.report({
      node: current,
      message: needsBlankLine ? BOUNDARY_MESSAGE : MESSAGE,
      fix(fixer) {
        const newline = source.includes("\r\n") ? "\r\n" : "\n";
        const indentation = /[\t ]*$/u.exec(gap)?.[0] ?? "";
        return fixer.replaceTextRange([start, end], (needsBlankLine ? newline + newline : newline) + indentation);
      },
    });
  }
}
