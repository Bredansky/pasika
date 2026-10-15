/**
 * ESLint rule: pasika/no-inline-runtime-literal
 *
 * Runtime string and numeric values must be named constants or enum members.
 * Only JSX className props may contain inline literal values. Module specifiers, directives,
 * property keys and TypeScript structural keys are syntax, not runtime values.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { isProductionSource } from "../project/semantic-literals";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const MESSAGE = `Every runtime string or numeric value must use a named constant or enum member, including single-use values. Only JSX className props permit inline values. ${DOC}`;

// ESLint's core Node type excludes parser-specific JSX and TS ancestors.
// Traverse only the structural fields needed to inspect them without casting.
interface AncestorNode {
  type: string;
  parent?: AncestorNode | null;
  name?: unknown;
  initializer?: unknown;
  init?: unknown;
  id?: unknown;
  kind?: unknown;
  key?: unknown;
  computed?: unknown;
  directive?: unknown;
  argument?: unknown;
  operator?: unknown;
}

function isClassNameProp(node: AncestorNode): boolean {
  let current = node;
  while (current.parent) {
    current = current.parent;
    if (current.type === "JSXAttribute") {
      const { name } = current;
      return typeof name === "object" && name !== null && "name" in name && name.name === "className";
    }
    if (current.type === "Program") return false;
  }
  return false;
}

function isNamedValue(node: AncestorNode): boolean {
  let current = node;
  // Type assertions and signed numeric literals preserve named initializer ownership.
  while (current.parent) {
    const parent = current.parent;
    const isTypeWrapper = parent.type === "TSAsExpression" || parent.type === "TSSatisfiesExpression";
    const isSignedNumber =
      parent.type === "UnaryExpression" &&
      parent.argument === current &&
      (parent.operator === "-" || parent.operator === "+");
    if (!isTypeWrapper && !isSignedNumber) break;
    current = parent;
  }
  const parent = current.parent;
  if (!parent) return false;
  if (parent.type === "TSEnumMember" && parent.initializer === current) return true;
  if (parent.type !== "VariableDeclarator" || parent.init !== current) return false;
  const id = parent.id;
  return (
    parent.parent?.type === "VariableDeclaration" &&
    parent.parent.kind === "const" &&
    typeof id === "object" &&
    id !== null &&
    "type" in id &&
    id.type === "Identifier"
  );
}

function isSyntacticString(node: AncestorNode): boolean {
  const parent = node.parent;
  if (!parent) return false;
  // These tokens cannot be replaced with constants in the relevant syntax.
  if (
    parent.type === "ImportDeclaration" ||
    parent.type === "ExportNamedDeclaration" ||
    parent.type === "ExportAllDeclaration" ||
    parent.type === "ImportExpression" ||
    parent.type === "TSLiteralType" ||
    parent.type === "TSExternalModuleReference"
  ) {
    return true;
  }
  if (parent.type === "ExpressionStatement" && typeof parent.directive === "string") return true;
  if (
    (parent.type === "Property" || parent.type === "MethodDefinition") &&
    parent.key === node &&
    parent.computed === false
  ) {
    return true;
  }
  return false;
}

export const noInlineRuntimeLiteralRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Require named runtime string and numeric values except inside JSX className props." },
  },
  create(context) {
    const root = sourceRootOf(context);
    const file = path.resolve(context.filename);
    if (!file.startsWith(root + path.sep) || !isProductionSource(file, root)) return {};
    return {
      Literal(node: Rule.Node & ESTree.Literal) {
        if (
          typeof node.value !== "string" &&
          typeof node.value !== "number" &&
          typeof node.value !== "bigint" &&
          !("bigint" in node && typeof node.bigint === "string")
        ) {
          return;
        }
        if (isClassNameProp(node) || isNamedValue(node) || isSyntacticString(node)) return;
        context.report({ node, message: MESSAGE });
      },
      TemplateLiteral(node: Rule.Node & ESTree.TemplateLiteral) {
        if (isClassNameProp(node) || isNamedValue(node)) return;
        if (node.quasis.every((quasi) => quasi.value.raw === "")) return;
        context.report({ node, message: MESSAGE });
      },
      JSXText(node: Rule.Node) {
        if (!("value" in node) || typeof node.value !== "string" || node.value.trim().length === 0) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
};
