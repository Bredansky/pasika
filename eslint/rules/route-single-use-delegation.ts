/**
 * Single-use route delegation detector for pasika/route-handler-shape.
 *
 * A route may call reusable operations, but a utility that only transfers its
 * entire response through one handler call is unnecessary indirection.
 * @see docs/next-codebase-guide/rules/route-handler-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import type * as ESTree from "estree";
import { getProjectIndex, resolveSpecifier, symbolKey, type ProjectIndex } from "../project/index";
import { sourceRootOf } from "./project-root";

type Handler = ESTree.ArrowFunctionExpression | ESTree.FunctionExpression;

function responseCall(expression: ESTree.Node | null | undefined): ESTree.CallExpression | undefined {
  if (!expression) return undefined;
  if (expression.type === "AwaitExpression") return responseCall(expression.argument);
  if (expression.type === "CallExpression" && expression.callee.type === "Identifier") return expression;
  if (expression.type !== "ObjectExpression") return undefined;

  // Status and message metadata are harmless, but a second computed value is
  // a real workflow step and should keep the normal imported operations.
  const dataProperties = expression.properties.filter(
    (property) =>
      property.type === "Property" &&
      !property.computed &&
      ((property.key.type === "Identifier" && property.key.name === "data") ||
        (property.key.type === "Literal" && property.key.value === "data")),
  );
  if (dataProperties.length !== 1) return undefined;
  const otherProperties = expression.properties.filter((property) => !dataProperties.includes(property));
  if (
    otherProperties.some(
      (property) => property.type !== "Property" || property.value.type !== "Literal" || property.computed,
    )
  ) {
    return undefined;
  }
  return responseCall(dataProperties[0]?.type === "Property" ? dataProperties[0].value : undefined);
}

function soleDelegation(handler: Handler): ESTree.CallExpression | undefined {
  if (handler.body.type !== "BlockStatement") return responseCall(handler.body);
  const statements = handler.body.body;
  if (statements.length === 1 && statements[0]?.type === "ReturnStatement") {
    return responseCall(statements[0].argument);
  }

  const [declaration, returned] = statements;
  if (
    statements.length !== 2 ||
    declaration?.type !== "VariableDeclaration" ||
    declaration.declarations.length !== 1 ||
    returned?.type !== "ReturnStatement"
  ) {
    return undefined;
  }

  const variable = declaration.declarations[0];
  if (variable?.id.type !== "Identifier") return undefined;
  const call = responseCall(variable.init);
  if (!call || !returned.argument) return undefined;

  if (returned.argument.type === "Identifier" && returned.argument.name === variable.id.name) return call;
  if (returned.argument.type !== "ObjectExpression") return undefined;
  const properties = returned.argument.properties;
  if (properties.length !== 1 || properties[0]?.type !== "Property") return undefined;
  const property = properties[0];
  const key = property.key;
  const isData =
    !property.computed &&
    ((key.type === "Identifier" && key.name === "data") || (key.type === "Literal" && key.value === "data"));
  return isData && property.value.type === "Identifier" && property.value.name === variable.id.name ? call : undefined;
}

function isTestFile(file: string): boolean {
  return /(?:\.test|\.spec)\.[cm]?[jt]sx?$/.test(file) || path.normalize(file).split(path.sep).includes("__tests__");
}

/** Resolve a function through re-export barrels without counting the barrels as reuse. */
function functionSource(
  index: ProjectIndex,
  file: string,
  name: string,
  sourceRoot: string,
  visited = new Set<string>(),
): string | undefined {
  if (visited.has(file)) return undefined;
  visited.add(file);
  const module = index.modules.get(file);
  if (!module) return undefined;
  if (module.exports.some((entry) => entry.name === name && entry.kind === "function")) return file;
  if (
    !module.exports.some((entry) => entry.name === name) &&
    !module.reexports.some((entry) => entry.names.length === 0)
  ) {
    return undefined;
  }

  for (const entry of module.reexports) {
    if (entry.names.length > 0 && !entry.names.includes(name)) continue;
    const target = resolveSpecifier(file, entry.specifier, sourceRoot);
    if (!target) continue;
    const original = functionSource(index, target, name, sourceRoot, visited);
    if (original) return original;
  }
  return undefined;
}

/**
 * Find an imported utility whose only production consumer is this route and
 * whose local import binding is referenced exactly once.
 *
 * If imports or the source tree cannot be resolved, do not guess about reuse.
 */
export function singleUseResponseDelegate(context: Rule.RuleContext, handler: Handler): string | undefined {
  const call = soleDelegation(handler);
  if (call?.callee.type !== "Identifier") return undefined;

  const name = call.callee.name;
  const sourceRoot = sourceRootOf(context);
  const index = getProjectIndex(sourceRoot);
  if (!index) return undefined;

  for (const statement of context.sourceCode.ast.body) {
    if (statement.type !== "ImportDeclaration" || typeof statement.source.value !== "string") continue;
    const target = resolveSpecifier(context.filename, statement.source.value, sourceRoot);
    if (target === undefined || target === context.filename) continue;
    for (const specifier of statement.specifiers) {
      if (specifier.type !== "ImportSpecifier" || specifier.local.name !== name) continue;
      const original =
        specifier.imported.type === "Identifier" ? specifier.imported.name : String(specifier.imported.value);
      const source = functionSource(index, target, original, sourceRoot);
      if (!source) continue;

      const bindings = context.sourceCode.getDeclaredVariables(specifier);
      if (!bindings.some((binding) => binding.references.length === 1)) continue;

      const consumers = index.symbolConsumers.get(symbolKey(source, original));
      if (!consumers?.has(context.filename)) continue;
      const activeConsumers = [...consumers].filter((consumer) => {
        if (isTestFile(consumer)) return false;
        const module = index.modules.get(consumer);
        // A pure re-export barrel is not an additional production call, even through nested barrels.
        return !(
          module &&
          module.reexports.length > 0 &&
          module.imports.length === module.reexports.length &&
          module.exports.every((entry) => entry.kind === "other")
        );
      });
      if (activeConsumers.length === 1 && activeConsumers[0] === context.filename) return original;
    }
  }
  return undefined;
}
