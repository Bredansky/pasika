/**
 * ESLint rule: pasika/no-inline-runtime-literal
 *
 * Runtime string and numeric values must be named constants or enum members.
 * Static JSX data-component markers, framework matcher declarations, inline JSX
 * className values, and canonical locale dictionary strings are exempt.
 * Module specifiers, ambient module names, directives, property keys and
 * TypeScript structural keys are syntax.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { isProductionSource } from "../project/semantic-literals";
import { sourceRootOf } from "./project-root";

const DOC = "See docs/next-codebase-guide/rules/constants-rule.md";
const MESSAGE = `Every runtime string or numeric value must use a named constant or enum member, including single-use values. Inline JSX className/data-component, canonical locale strings, and static Next.js matchers are exempt. ${DOC}`;

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
  value?: unknown;
  left?: unknown;
  right?: unknown;
  expression?: unknown;
  elements?: unknown;
  properties?: unknown;
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

function isStaticDataComponentMarker(node: AncestorNode): boolean {
  const parent = node.parent;
  if (parent?.type !== "JSXAttribute" || parent.value !== node) return false;
  const name = parent.name;
  return typeof name === "object" && name !== null && "name" in name && name.name === "data-component";
}

/**
 * Next.js extracts the exported config.matcher from syntax rather than executing
 * module constants. Permit literal matcher data in its AST, not arbitrary
 * expressions or values from unrelated config objects.
 */
function isStaticMatcherValue(node: AncestorNode, root: string, file: string): boolean {
  const relativeFile = path.relative(root, file);
  if (relativeFile !== "middleware.ts" && relativeFile !== "proxy.ts") return false;

  let current = node;
  while (current.parent) {
    const parent = current.parent;
    if (parent.type === "ArrayExpression" && Array.isArray(parent.elements) && parent.elements.includes(current)) {
      current = parent;
      continue;
    }
    if (parent.type === "ObjectExpression" && Array.isArray(parent.properties) && parent.properties.includes(current)) {
      current = parent;
      continue;
    }
    if (parent.type !== "Property" || parent.value !== current || parent.computed) return false;

    const key = parent.key;
    if (typeof key !== "object" || key === null) return false;
    const isMatcher = ("name" in key && key.name === "matcher") || ("value" in key && key.value === "matcher");
    if (!isMatcher) {
      current = parent;
      continue;
    }

    const object = parent.parent;
    if (object?.type !== "ObjectExpression") return false;
    let configValue = object;
    while (
      (configValue.parent?.type === "TSAsExpression" || configValue.parent?.type === "TSSatisfiesExpression") &&
      configValue.parent.expression === configValue
    ) {
      configValue = configValue.parent;
    }
    const declaration = configValue.parent;
    const id = declaration?.id;
    return (
      declaration?.type === "VariableDeclarator" &&
      declaration.init === configValue &&
      typeof id === "object" &&
      id !== null &&
      "name" in id &&
      id.name === "config" &&
      declaration.parent?.type === "VariableDeclaration" &&
      declaration.parent.kind === "const" &&
      declaration.parent.parent?.type === "ExportNamedDeclaration"
    );
  }
  return false;
}

function containsInlineString(node: unknown): boolean {
  if (typeof node !== "object" || node === null || !("type" in node)) return false;
  if (node.type === "TemplateLiteral") return true;
  if (node.type === "Literal") return "value" in node && typeof node.value === "string";
  if (node.type === "BinaryExpression") {
    return ("left" in node && containsInlineString(node.left)) || ("right" in node && containsInlineString(node.right));
  }
  if (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression") {
    return "expression" in node && containsInlineString(node.expression);
  }
  return false;
}

function isNamedValue(node: AncestorNode): boolean {
  let current = node;
  // Arithmetic and string concatenation allow literals only when they
  // directly initialize a named const, not an enum member.
  let isCalculation = false;
  while (current.parent) {
    const parent = current.parent;
    const isTypeWrapper = parent.type === "TSAsExpression" || parent.type === "TSSatisfiesExpression";
    const isSignedNumber =
      parent.type === "UnaryExpression" &&
      parent.argument === current &&
      (parent.operator === "-" || parent.operator === "+");
    const isArithmetic =
      parent.type === "BinaryExpression" &&
      typeof parent.operator === "string" &&
      ["+", "-", "*", "/", "%", "**", "<<", ">>", ">>>", "&", "|", "^"].includes(parent.operator) &&
      (parent.operator === "+" || (!containsInlineString(parent.left) && !containsInlineString(parent.right)));
    if (!isTypeWrapper && !isSignedNumber && !isArithmetic) break;
    if (isArithmetic) isCalculation = true;
    current = parent;
  }
  const parent = current.parent;
  if (!parent) return false;
  if (parent.type === "TSEnumMember" && parent.initializer === current) return !isCalculation;
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
  // Ambient module specifiers cannot be replaced by identifiers.
  if (parent.type === "TSModuleDeclaration" && parent.id === node) return true;
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

/**
 * Runtime mock handlers live in mocks/ folders, but are application code rather
 * than test fixtures. Keep other rules' shared production-source classification
 * unchanged, and exclude tests and dedicated __mocks__ fixtures.
 */
function isRuntimeMockSource(file: string, root: string): boolean {
  const parts = path.relative(root, file).split(path.sep);
  return (
    parts.includes("mocks") &&
    !parts.some((part) => part === "__tests__" || part === "__mocks__") &&
    !/\.(?:test|spec|mock)\.[^.]+$/.test(path.basename(file))
  );
}

/**
 * Locale values are exempt only within named, exported dictionary modules.
 */
function isCanonicalLocaleString(node: AncestorNode, root: string, file: string): boolean {
  const relative = path.relative(root, file).split(path.sep);
  let namespace: string | undefined;
  if (
    relative.length === 2 &&
    relative[0] === "locales" &&
    relative[1] !== "index.ts" &&
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.ts$/.test(relative[1] ?? "")
  ) {
    namespace = (relative[1] ?? "").slice(0, -3).replace(/-[a-z]/g, (match) => match.slice(1).toUpperCase());
  }
  if (!namespace) return false;
  if (node.parent?.type !== "Property" || node.parent.value !== node) return false;
  let current = node.parent.parent;
  if (current?.type !== "ObjectExpression") return false;
  while (
    (current.parent?.type === "TSAsExpression" || current.parent?.type === "TSSatisfiesExpression") &&
    current.parent.expression === current
  ) {
    current = current.parent;
  }
  const declaration = current.parent;
  const id = declaration?.id;
  return (
    declaration?.type === "VariableDeclarator" &&
    declaration.init === current &&
    typeof id === "object" &&
    id !== null &&
    "type" in id &&
    id.type === "Identifier" &&
    "name" in id &&
    id.name === namespace &&
    declaration.parent?.type === "VariableDeclaration" &&
    declaration.parent.kind === "const" &&
    declaration.parent.parent?.type === "ExportNamedDeclaration"
  );
}

export const noInlineRuntimeLiteralRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: { description: "Require named runtime values except JSX className and canonical locale strings." },
  },
  create(context) {
    const root = sourceRootOf(context);
    const file = path.resolve(context.filename);
    if (!file.startsWith(root + path.sep) || (!isProductionSource(file, root) && !isRuntimeMockSource(file, root))) {
      return {};
    }
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
        if (
          (typeof node.value === "string" &&
            (isClassNameProp(node) ||
              isStaticDataComponentMarker(node) ||
              isCanonicalLocaleString(node, root, file))) ||
          isStaticMatcherValue(node, root, file) ||
          isNamedValue(node) ||
          isSyntacticString(node)
        ) {
          return;
        }
        context.report({ node, message: MESSAGE });
      },
      TemplateLiteral(node: Rule.Node & ESTree.TemplateLiteral) {
        if (
          isClassNameProp(node) ||
          isNamedValue(node) ||
          (node.expressions.length === 0 && isCanonicalLocaleString(node, root, file))
        ) {
          return;
        }
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
