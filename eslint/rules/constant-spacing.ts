/**
 * Declaration spacing shared by pasika/constant-casing.
 * Line wrapping alone is not a boundary; multiline object and array literals (including call arguments) and
 * callable constants, function declarations and interfaces are separated. Export visibility and comments also mark boundaries.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import type { AST, Rule } from "eslint";
import type { Node, VariableDeclarator } from "estree";
import { typedParserServices } from "./contract-ownership";

const MESSAGE =
  "Consecutive const declarations must not have blank lines between them. See docs/next-codebase-guide/rules/constants-rule.md";
const TYPE_MESSAGE =
  "Consecutive type aliases must not have blank lines between them. See docs/next-codebase-guide/rules/constants-rule.md";
const BOUNDARY_MESSAGE =
  "Different declaration groups must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const CALLABLE_MESSAGE =
  "Callable const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const STRUCTURED_MESSAGE =
  "Multiline object and array const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const VISIBILITY_MESSAGE =
  "Exported and non-exported const declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const DECLARATION_MESSAGE =
  "Function and interface declarations must be separated by a blank line. See docs/next-codebase-guide/rules/constants-rule.md";
const BLANK_LINE = /\r?\n[\t ]*\r?\n/u;
const ROUTE_FILE = /\/app\/(?:.*\/)?route\.[cm]?[jt]sx?$/u;

export const NEXTJS_ROUTE_HANDLER_NAMES = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

type Statement = AST.Program["body"][number];
type Group =
  | "import"
  | "type"
  | "exported-type"
  | "interface"
  | "enum"
  | "const"
  | "exported-const"
  | "structured"
  | "callable"
  | "function"
  | "export";

function isVitestCall(context: Rule.RuleContext, node: Node | null | undefined, method: string): boolean {
  if (node?.type !== "CallExpression") return false;
  const callee = node.callee;
  if (
    callee.type !== "MemberExpression" ||
    callee.computed ||
    callee.property.type !== "Identifier" ||
    callee.property.name !== method ||
    callee.object.type !== "Identifier"
  ) {
    return false;
  }

  const receiver = callee.object;
  const initialScope = context.sourceCode.getScope(receiver);
  for (let scope: typeof initialScope | null = initialScope; scope !== null; scope = scope.upper) {
    const variable = scope.set.get(receiver.name);
    if (!variable) continue;
    return variable.defs.some((definition) => {
      if (
        definition.type !== "ImportBinding" ||
        definition.parent.source.value !== "vitest" ||
        definition.node.type !== "ImportSpecifier"
      ) {
        return false;
      }
      const imported = definition.node.imported;
      return imported.type === "Identifier" && (imported.name === "vi" || imported.name === "vitest");
    });
  }
  return false;
}

function isVitestMock(context: Rule.RuleContext, node: Node | null | undefined): boolean {
  if (isVitestCall(context, node, "fn")) return true;
  if (node?.type !== "CallExpression" || !isVitestCall(context, node, "hoisted")) return false;
  const factory = node.arguments[0];
  return (
    factory?.type === "ArrowFunctionExpression" &&
    factory.body.type !== "BlockStatement" &&
    isVitestCall(context, factory.body, "fn")
  );
}

function isCallableConstant(context: Rule.RuleContext, node: Statement, binding: VariableDeclarator): boolean {
  if (binding.id.type !== "Identifier") return false;
  if (
    node.type === "ExportNamedDeclaration" &&
    ROUTE_FILE.test(context.filename.replaceAll("\\", "/")) &&
    NEXTJS_ROUTE_HANDLER_NAMES.has(binding.id.name)
  ) {
    return true;
  }
  if (isVitestMock(context, binding.init)) return false;
  if (binding.init?.type === "ArrowFunctionExpression" || binding.init?.type === "FunctionExpression") return true;

  const services = typedParserServices(context.sourceCode.parserServices);
  if (!services) return false;
  const tsNode = services.esTreeNodeToTSNodeMap.get(binding.id);
  if (!tsNode) return false;
  return services.program.getTypeChecker().getTypeAtLocation(tsNode).getCallSignatures().length > 0;
}

function isExpressionWrapper(node: Node): node is Node & { expression: Node } {
  return (
    ["TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression", "ChainExpression"].includes(
      node.type,
    ) &&
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
  if (current?.type === "CallExpression") return current.arguments.some(isMultilineStructure);
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
  if (type === "TSInterfaceDeclaration") return "interface";
  if (type === "TSTypeAliasDeclaration") return node.type === "ExportNamedDeclaration" ? "exported-type" : "type";
  if (type === "TSEnumDeclaration") return "enum";
  if (declaration?.type === "FunctionDeclaration") return "function";
  if (declaration?.type !== "VariableDeclaration" || declaration.kind !== "const") return undefined;
  const binding = declaration.declarations[0];
  if (declaration.declarations.length !== 1 || binding?.id.type !== "Identifier") return undefined;
  if (isCallableConstant(context, node, binding)) return "callable";
  if (isMultilineStructure(binding.init)) return "structured";
  return node.type === "ExportNamedDeclaration" ? "exported-const" : "const";
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
      (first === second &&
        first !== "type" &&
        first !== "exported-type" &&
        first !== "const" &&
        first !== "exported-const" &&
        first !== "callable" &&
        first !== "structured" &&
        first !== "function" &&
        first !== "interface")
    ) {
      continue;
    }
    const callableBoundary = first === "callable" || second === "callable";
    const structuredBoundary = first === "structured" || second === "structured";
    const declarationBoundary =
      first === "function" || second === "function" || first === "interface" || second === "interface";
    const needsBlankLine = first !== second || callableBoundary || structuredBoundary || declarationBoundary;
    const start = previous.range?.[1];
    const end = current.range?.[0];
    if (start === undefined || end === undefined) continue;
    const gap = source.slice(start, end);
    if (gap.trim() || (BLANK_LINE.test(gap) === needsBlankLine && gap.includes("\n"))) continue;

    const visibilityBoundary =
      (first === "const" && second === "exported-const") || (first === "exported-const" && second === "const");
    const ordinaryBoundaryMessage = first === second && declarationBoundary ? DECLARATION_MESSAGE : BOUNDARY_MESSAGE;
    const groupMessage = visibilityBoundary ? VISIBILITY_MESSAGE : ordinaryBoundaryMessage;
    const boundaryMessage = structuredBoundary ? STRUCTURED_MESSAGE : groupMessage;
    const compactMessage = first === "type" || first === "exported-type" ? TYPE_MESSAGE : MESSAGE;
    const message = needsBlankLine ? boundaryMessage : compactMessage;
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
