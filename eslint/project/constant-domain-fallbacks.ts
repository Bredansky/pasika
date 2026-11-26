/**
 * Explicit fallback contracts for APIs whose TypeScript types are open,
 * missing, or too weak to establish a finite vocabulary.
 */
import ts from "typescript";
export function intrinsicAttributeDomain(node: ts.JsxAttribute): string | undefined {
  const element = node.parent.parent;
  if (!ts.isIdentifier(element.tagName) || !/^[a-z]/u.test(element.tagName.text) || !ts.isIdentifier(node.name)) {
    return undefined;
  }
  const tag = element.tagName.text;
  const attribute = node.name.text;
  if (attribute === "role") return "aria:role";
  if (tag === "input" && attribute === "type") return "html:input-type";
  if (tag === "button" && attribute === "type") return "html:button-type";
  if (tag === "track" && attribute === "kind") return "html:track-kind";
  if (tag === "input" && attribute === "accept") return "media:mime";
  if (attribute === "data-sidebar" || attribute === "data-slot") return `component-marker:${attribute}`;
  return undefined;
}

function platformProperty(program: ts.Program, symbol: ts.Symbol | undefined, owner: string): boolean {
  return (
    symbol?.declarations?.some(
      (declaration) =>
        program.isSourceFileDefaultLibrary(declaration.getSourceFile()) &&
        ts.isInterfaceDeclaration(declaration.parent) &&
        declaration.parent.name.text === owner,
    ) ?? false
  );
}

export function propertyDomain(
  program: ts.Program,
  checker: ts.TypeChecker,
  node: ts.PropertyAssignment,
): string | undefined {
  if (!ts.isObjectLiteralExpression(node.parent) || !ts.isIdentifier(node.name)) return undefined;
  const type = checker.getContextualType(node.parent);
  if (!type) return undefined;
  const property = checker.getPropertyOfType(type, node.name.text);
  if (platformProperty(program, property, "DateTimeFormatOptions")) return "date-format:options";
  return undefined;
}

export function comparisonDomain(
  program: ts.Program,
  checker: ts.TypeChecker,
  node: ts.Expression,
): string | undefined {
  if (ts.isTypeOfExpression(node)) return "js-type:typeof";
  if (!ts.isPropertyAccessExpression(node) || node.name.text !== "kind") return undefined;
  return platformProperty(program, checker.getSymbolAtLocation(node.name), "DataTransferItem")
    ? "clipboard:item-kind"
    : undefined;
}

export function mimePrefix(program: ts.Program, checker: ts.TypeChecker, node: ts.CallExpression): boolean {
  if (!ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== "startsWith") return false;
  const receiver = node.expression.expression;
  if (!ts.isPropertyAccessExpression(receiver) || receiver.name.text !== "type") return false;
  const symbol = checker.getSymbolAtLocation(receiver.name);
  return platformProperty(program, symbol, "DataTransferItem") || platformProperty(program, symbol, "Blob");
}
