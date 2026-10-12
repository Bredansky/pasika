/**
 * A conservative project-wide index of literals with identifiable semantic
 * roles. UI copy, imports, schema declarations, tests and arbitrary expressions
 * are deliberately not treated as evidence of duplication.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { ProjectIndex } from "./index";

export type LiteralValue = string | number;
export interface SemanticLiteral {
  file: string;
  kind: "string" | "number";
  value: LiteralValue;
  role: string;
  family: string;
  line: number;
  column: number;
}
export interface CanonicalLiteral {
  file: string;
  name: string;
  owner?: string;
  kind: "string" | "number";
  value: LiteralValue;
}
export interface SemanticLiteralIndex {
  uses: SemanticLiteral[];
  canonicals: CanonicalLiteral[];
}

const excludedProperties = new Set([
  "label",
  "title",
  "description",
  "message",
  "text",
  "placeholder",
  "className",
  "content",
  "alt",
  "src",
  "href",
  "url",
  "html",
  "ariaLabel",
  "testId",
]);
const semanticProperties = new Set(["status", "phase", "event", "eventName", "action", "storageKey", "endpoint"]);
const semanticVariableName = /route|path|key|status|event|timeout|delay|token|column|endpoint|limit|duration/i;
const columnMethods = new Set([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "is",
  "in",
  "order",
  "filter",
  "not",
]);
const eventMethods = new Set(["emit", "on", "off", "once", "addListener", "removeListener"]);
const ignoredNumbers = new Set([-1, 0, 1]);

export function isProductionSource(file: string, root: string): boolean {
  const parts = path.relative(root, file).split(path.sep);
  return !(
    /\.(?:test|spec|mock)\.[^.]+$/.test(path.basename(file)) ||
    parts.some((part) => part === "__tests__" || part === "__mocks__" || part === "mocks")
  );
}

export function featureOf(file: string, root: string): string {
  const parts = path.relative(root, file).split(path.sep);
  if (parts[0] === "features" && parts[1]) return `feature:${parts[1]}`;
  return `layer:${parts[0] ?? "src"}`;
}

function nameOf(property: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(property) || ts.isStringLiteral(property)) return property.text;
  return undefined;
}

function literalOf(node: ts.Node): LiteralValue | undefined {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text.replaceAll("_", ""));
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    return -Number(node.operand.text.replaceAll("_", ""));
  }
  return undefined;
}

function isLiteralRoot(node: ts.Node): boolean {
  if (ts.isPrefixUnaryExpression(node)) return literalOf(node) !== undefined;
  return (
    (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) &&
    !(ts.isPrefixUnaryExpression(node.parent) && node.parent.operand === node)
  );
}

function invocation(node: ts.CallExpression): { method: string; receiver?: string } | undefined {
  if (ts.isIdentifier(node.expression)) return { method: node.expression.text };
  if (ts.isPropertyAccessExpression(node.expression)) {
    const receiver = node.expression.expression.getText();
    // Avoid grouping unrelated dynamic receivers with identical method names.
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?$/.test(receiver)) return undefined;
    return { method: node.expression.name.text, receiver };
  }
  return undefined;
}

function isPathname(node: ts.Expression): boolean {
  return ts.isPropertyAccessExpression(node) && node.name.text === "pathname";
}

function contextFor(
  node: ts.Node,
  value: LiteralValue,
  file: string,
  root: string,
): { role: string; family: string } | undefined {
  if (typeof value === "number" && ignoredNumbers.has(value)) return undefined;
  if (typeof value === "string" && (value.length < 3 || /\s/.test(value))) return undefined;
  const parent = node.parent;
  const scope = featureOf(file, root);
  const isApiRoute = typeof value === "string" && value.startsWith("/api/") && !/[?&#\s]/.test(value);
  const route = (): { role: string; family: string } => ({ role: "api-route", family: "api-route" });
  if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    const name = nameOf(parent.name);
    if (!name) return undefined;
    if (name === "path" && isApiRoute) return route();
    if (!semanticProperties.has(name)) return undefined;
    // The numeric named-slot rule already owns numeric property assignments.
    if (typeof value === "number") return undefined;
    if (isApiRoute && /route|path|endpoint/i.test(name)) return route();
    return { role: `property:${name}:${scope}`, family: `property:${name}` };
  }
  if (ts.isVariableDeclaration(parent) && parent.initializer === node && ts.isIdentifier(parent.name)) {
    // Numeric declarations are already covered by repeated-numeric-value.
    if (typeof value === "number") return undefined;
    const name = parent.name.text;
    if (excludedProperties.has(name) || !semanticVariableName.test(name)) return undefined;
    if (isApiRoute && /route|path|endpoint/i.test(name)) return route();
    return { role: `variable:${name}:${scope}`, family: `variable:${name}` };
  }
  if (ts.isCallExpression(parent)) {
    const position = parent.arguments.findIndex((argument) => argument === node);
    if (position < 0) return undefined;
    const call = invocation(parent);
    if (!call) return undefined;
    if (isApiRoute && position === 0 && (call.method === "fetch" || call.method === "zodFetch")) return route();
    if (
      typeof value === "number" &&
      position === 1 &&
      (call.method === "setTimeout" || call.method === "setInterval")
    ) {
      return { role: `timer:${call.method}:${scope}`, family: "timer" };
    }
    if (
      typeof value === "string" &&
      position === 0 &&
      call.receiver &&
      (call.receiver === "localStorage" || call.receiver === "sessionStorage") &&
      ["getItem", "setItem", "removeItem"].includes(call.method)
    ) {
      return { role: `storage:${call.receiver}`, family: "storage" };
    }
    if (
      typeof value === "string" &&
      position === 0 &&
      call.receiver &&
      eventMethods.has(call.method) &&
      /(?:event|bus|socket|emitter)/i.test(call.receiver)
    ) {
      return { role: `event:${call.receiver}`, family: "event" };
    }
    if (
      typeof value === "string" &&
      position === 0 &&
      call.receiver &&
      columnMethods.has(call.method) &&
      value.length > 3 &&
      /^[a-z][a-z0-9_]*$/.test(value)
    ) {
      return { role: `column:${scope}`, family: "column" };
    }
  }
  if (
    isApiRoute &&
    ts.isBinaryExpression(parent) &&
    (parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken) &&
    ((parent.left === node && isPathname(parent.right)) || (parent.right === node && isPathname(parent.left)))
  ) {
    return route();
  }
  if (
    isApiRoute &&
    ts.isCallExpression(parent) &&
    parent.arguments[0] === node &&
    ts.isPropertyAccessExpression(parent.expression) &&
    parent.expression.name.text === "startsWith" &&
    isPathname(parent.expression.expression)
  ) {
    return route();
  }
  return undefined;
}

function isExported(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

function parse(file: string, root: string, output: SemanticLiteralIndex): void {
  if (!isProductionSource(file, root)) return;
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const inConstants = path.relative(root, file).split(path.sep).includes("constants");

  for (const statement of source.statements) {
    if (inConstants && ts.isEnumDeclaration(statement) && isExported(statement)) {
      for (const member of statement.members) {
        const value = member.initializer && literalOf(member.initializer);
        const memberName = nameOf(member.name);
        if (value === undefined || !memberName) continue;
        output.canonicals.push({
          file,
          name: memberName,
          owner: statement.name.text,
          kind: typeof value === "string" ? "string" : "number",
          value,
        });
      }
    }
    if (inConstants && ts.isVariableStatement(statement) && isExported(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        const value = literalOf(declaration.initializer);
        if (value === undefined) continue;
        output.canonicals.push({
          file,
          name: declaration.name.text,
          kind: typeof value === "string" ? "string" : "number",
          value,
        });
      }
    }
  }

  const visit = (node: ts.Node): void => {
    if (isLiteralRoot(node)) {
      const value = literalOf(node);
      if (value !== undefined) {
        const semantic = contextFor(node, value, file, root);
        if (semantic) {
          // Definitions in canonical constants modules are not raw usages.
          const declaration = node.parent;
          const isCanonicalDefinition =
            inConstants &&
            ((ts.isVariableDeclaration(declaration) &&
              ts.isVariableStatement(declaration.parent.parent) &&
              isExported(declaration.parent.parent)) ||
              ts.isEnumMember(declaration));
          if ((!inConstants || semantic.family === "api-route") && !isCanonicalDefinition) {
            const position = source.getLineAndCharacterOfPosition(node.getStart(source));
            output.uses.push({
              file,
              kind: typeof value === "string" ? "string" : "number",
              value,
              line: position.line + 1,
              column: position.character,
              ...semantic,
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

const cache = new WeakMap<ProjectIndex, SemanticLiteralIndex>();

export function getSemanticLiteralIndex(index: ProjectIndex): SemanticLiteralIndex {
  const previous = cache.get(index);
  if (previous) return previous;
  const result: SemanticLiteralIndex = { uses: [], canonicals: [] };
  for (const file of index.modules.keys()) {
    try {
      parse(file, index.sourceRoot, result);
    } catch {
      // A concurrently edited or unreadable file cannot contribute to this run.
    }
  }
  cache.set(index, result);
  return result;
}
