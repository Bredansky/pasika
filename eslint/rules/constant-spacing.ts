/**
 * Declaration spacing shared by pasika/constant-casing.
 * Line wrapping alone is not a boundary; multiline object and array literals and
 * callable constants are separated, and comments remain intentional boundaries.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import type { AST, Rule } from "eslint";
import type { Node, VariableDeclarator } from "estree";
import { typedParserServices } from "./contract-ownership";

const MESSAGE =
  "Consecutive const declarations must not have blank lines between them. See docs/next-codebase-guide/rules/constants-rule.md";
const BOUNDARY_MESSAGE =
  "Different declaration groups must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const CALLABLE_MESSAGE =
  "Callable const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const STRUCTURED_MESSAGE =
  "Multiline object and array const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const BLANK_LINE = /\r?\n[\t ]*\r?\n/u;
const ROUTE_FILE = /\/app\/(?:.*\/)?route\.[cm]?[jt]sx?$/u;

export const NEXTJS_ROUTE_HANDLER_NAMES = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

type Statement = AST.Program["body"][number];
type Group = "import" | "type" | "enum" | "const" | "structured" | "callable" | "function" | "export";

function isCallableConstant(context: Rule.RuleContext, node: Statement, binding: VariableDeclarator): boolean {
  if (binding.id.type !== "Identifier") return false;
  if (
    node.type === "ExportNamedDeclaration" &&
    ROUTE_FILE.test(context.filename.replaceAll("\\", "/")) &&
    NEXTJS_ROUTE_HANDLER_NAMES.has(binding.id.name)
  ) {
    return true;
  }
  if (binding.init?.type === "ArrowFunctionExpression" || binding.init?.type === "FunctionExpression") return true;

  const services = typedParserServices(context.sourceCode.parserServices);
  if (!services) return false;
  const tsNode = services.esTreeNodeToTSNodeMap.get(binding.id);
  if (!tsNode) return false;
  return services.program.getTypeChecker().getTypeAtLocation(tsNode).getCallSignatures().length > 0;
}

function isExpressionWrapper(node: Node): node is Node & { expression: Node } {
  return (
    ["TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression"].includes(node.type) &&
    "expression" in node &&
    typeof node.expression === "object" &&
    "type" in node.expression
  );
}

function isMultilineStructure(node: Node | null | undefined): boolean {
  let current = node;
  while (current && isExpressionWrapper(current)) {
    current = current.expression;
  }
  return (
    (current?.type === "ObjectExpression" || current?.type === "ArrayExpression") &&
    Boolean(current.loc && current.loc.start.line !== current.loc.end.line)
  );
}

function declarationGroup(context: Rule.RuleContext, node: Statement): Group | undefined {
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
  const binding = declaration.declarations[0];
  if (declaration.declarations.length !== 1 || binding?.id.type !== "Identifier") return undefined;
  if (isCallableConstant(context, node, binding)) return "callable";
  return isMultilineStructure(binding.init) ? "structured" : "const";
}

export function enforceConstantSpacing(context: Rule.RuleContext): void {
  const statements = context.sourceCode.ast.body;
  const source = context.sourceCode.text;
  for (let index = 1; index < statements.length; index += 1) {
    const previous = statements[index - 1];
    const current = statements[index];
    if (!previous || !current) continue;

    const first = declarationGroup(context, previous);
    const second = declarationGroup(context, current);
    if (
      !first ||
      !second ||
      (first === second && first !== "const" && first !== "callable" && first !== "structured")
    ) {
      continue;
    }
    const callableBoundary = first === "callable" || second === "callable";
    const structuredBoundary = first === "structured" || second === "structured";
    const needsBlankLine = first !== second || callableBoundary || structuredBoundary;
    const start = previous.range?.[1];
    const end = current.range?.[0];
    if (start === undefined || end === undefined) continue;
    const gap = source.slice(start, end);
    if (gap.trim() || (BLANK_LINE.test(gap) === needsBlankLine && gap.includes("\n"))) continue;

    const boundaryMessage = structuredBoundary ? STRUCTURED_MESSAGE : BOUNDARY_MESSAGE;
    const message = needsBlankLine ? boundaryMessage : MESSAGE;
    context.report({
      node: current,
      message: callableBoundary ? CALLABLE_MESSAGE : message,
      fix(fixer) {
        const newline = source.includes("\r\n") ? "\r\n" : "\n";
        const indentation = /[\t ]*$/u.exec(gap)?.[0] ?? "";
        return fixer.replaceTextRange([start, end], (needsBlankLine ? newline + newline : newline) + indentation);
      },
    });
  }
}
