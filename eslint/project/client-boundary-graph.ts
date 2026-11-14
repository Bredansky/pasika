/**
 * Runtime import graph for Next.js React Server Component boundaries.
 *
 * Only imports of values create edges. Type-only imports never pull a module
 * into the server or client evaluation graph.
 *
 * @see docs/next-codebase-guide/rules/client-boundary-rule.md
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { getProjectIndex, resolveSpecifier } from "./index";

const ROUTE_ENTRY = /(?:^|[/\\])(?:page|layout|template|loading|not-found|default)\.[cm]?[jt]sx?$/u;
const SAFE_EXTERNALS = new Set([
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "next/link",
  "next/image",
  "lucide-react",
]);
const BROWSER_GLOBALS = new Set([
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "navigator",
  "matchMedia",
  "IntersectionObserver",
  "ResizeObserver",
  "MutationObserver",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "WebSocket",
  "MediaRecorder",
]);

export interface ClientModule {
  file: string;
  client: boolean;
  clientSignal: boolean;
  externalUnknown: boolean;
  imports: string[];
  consumers: Set<string>;
}

export interface ClientGraph {
  modules: Map<string, ClientModule>;
  /** Includes server-evaluated files and boundary files directly reached by server imports. */
  serverReachable: Set<string>;
  /** Includes the transitively imported module graph below explicit client entries. */
  clientReachable: Set<string>;
}

const graphs = new WeakMap<object, ClientGraph>();

function isRuntimeImport(clause: ts.ImportClause | undefined): boolean {
  if (!clause) return true; // bare side-effect import
  if (clause.phaseModifier === ts.SyntaxKind.TypeKeyword) return false;
  if (clause.name) return true;
  const bindings = clause.namedBindings;
  return !bindings || !ts.isNamedImports(bindings) || bindings.elements.some((element) => !element.isTypeOnly);
}

function isRuntimeReexport(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return false;
  if (node.exportClause && ts.isNamedExports(node.exportClause)) {
    return node.exportClause.elements.some((element) => !element.isTypeOnly);
  }
  return true;
}

function isClientHook(node: ts.CallExpression): boolean {
  const callee = node.expression;
  let name: string | undefined;
  if (ts.isIdentifier(callee)) {
    name = callee.text;
  } else if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === "React"
  ) {
    name = callee.name.text;
  }
  return name !== undefined && /^use[A-Z]/u.test(name) && name !== "useId";
}

function usesBrowserGlobal(node: ts.Identifier): boolean {
  if (!BROWSER_GLOBALS.has(node.text)) return false;
  const parent = node.parent;
  if (ts.isTypeOfExpression(parent)) return false;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false;
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) return false;
  if (ts.isPropertySignature(parent) || ts.isPropertyDeclaration(parent)) return false;
  return true;
}

function parseClientModule(file: string, sourceRoot: string): ClientModule {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const first = source.statements[0];
  const client =
    first !== undefined &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use client";
  const imports = new Set<string>();
  let clientSignal = false;
  let externalUnknown = false;

  const addImport = (specifier: string): void => {
    if (specifier === "client-only") {
      clientSignal = true;
      return;
    }
    const target = resolveSpecifier(file, specifier, sourceRoot);
    if (target) {
      imports.add(target);
    } else if (!specifier.startsWith(".") && !specifier.startsWith("@/") && !SAFE_EXTERNALS.has(specifier)) {
      externalUnknown = true;
    }
  };

  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      if (isRuntimeImport(statement.importClause)) addImport(statement.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      isRuntimeReexport(statement)
    ) {
      addImport(statement.moduleSpecifier.text);
    }
  }

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      if (isClientHook(node)) clientSignal = true;
      const firstArgument = node.arguments[0];
      if (firstArgument && ts.isStringLiteral(firstArgument)) {
        if (
          node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require")
        ) {
          addImport(firstArgument.text);
        }
      }
    }
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && /^on[A-Z]/u.test(node.name.text)) {
      clientSignal = true;
    }
    if (ts.isIdentifier(node) && usesBrowserGlobal(node)) clientSignal = true;
    ts.forEachChild(node, visit);
  };
  visit(source);

  return { file, client, clientSignal, externalUnknown, imports: [...imports], consumers: new Set() };
}

function traverse(roots: string[], modules: Map<string, ClientModule>, stopAtClient: boolean): Set<string> {
  const reached = new Set<string>();
  const pending = [...roots];
  while (pending.length) {
    const file = pending.pop();
    if (!file || reached.has(file)) continue;
    const module = modules.get(file);
    if (!module) continue;
    reached.add(file);
    if (stopAtClient && module.client) continue;
    pending.push(...module.imports);
  }
  return reached;
}

export function getClientGraph(sourceRoot: string): ClientGraph | undefined {
  const index = getProjectIndex(sourceRoot);
  if (!index) return undefined;
  const cached = graphs.get(index);
  if (cached) return cached;

  const modules = new Map<string, ClientModule>();
  for (const file of index.modules.keys()) {
    if (!/\.[cm]?[jt]sx?$/u.test(file)) continue;
    try {
      modules.set(file, parseClientModule(file, sourceRoot));
    } catch {
      // A partially saved file is handled by the parser during ordinary ESLint.
    }
  }
  for (const module of modules.values()) {
    for (const target of module.imports) modules.get(target)?.consumers.add(module.file);
  }

  const routes = [...modules.keys()].filter((file) => {
    const relative = path.relative(sourceRoot, file).replaceAll("\\", "/");
    return relative.startsWith("app/") && ROUTE_ENTRY.test(relative);
  });
  const serverReachable = traverse(routes, modules, true);
  const clientReachable = traverse(
    [...modules.values()].filter((module) => module.client).map((module) => module.file),
    modules,
    false,
  );
  const graph = { modules, serverReachable, clientReachable };
  graphs.set(index, graph);
  return graph;
}

export function isRequiredClientCapability(file: string, modules: Map<string, ClientModule>): boolean {
  const seen = new Set<string>();
  const pending = [file];
  while (pending.length) {
    const name = pending.pop();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const module = modules.get(name);
    if (!module) continue;
    if (module.clientSignal || module.externalUnknown) return true;
    // A separately marked component is already a valid server-to-client boundary.
    if (name !== file && module.client) continue;
    pending.push(...module.imports);
  }
  return false;
}
