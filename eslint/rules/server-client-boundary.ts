/**
 * ESLint rule: pasika/server-client-boundary
 *
 * A shared support entry must never transitively expose server-only code.
 * A "use client" entry must never reach server-only code through any runtime
 * import, re-export, require(), or dynamic import().
 *
 * @see docs/next-codebase-guide/rules/client-boundary-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { getClientGraph, type ClientGraph } from "../project/client-boundary-graph";
import { sourceRootOf } from "./project-root";

const SUPPORT_FOLDERS = new Set(["constants", "schemas", "types"]);
const DOC = "docs/next-codebase-guide/rules/client-boundary-rule.md";

function isSupportEntry(file: string): boolean {
  if (path.basename(file) !== "index.ts") return false;
  const parent = path.dirname(file);
  return SUPPORT_FOLDERS.has(path.basename(parent)) || SUPPORT_FOLDERS.has(path.basename(path.dirname(parent)));
}

function isServerEntry(file: string): boolean {
  return path.basename(file) === "server.ts" && SUPPORT_FOLDERS.has(path.basename(path.dirname(file)));
}

function pathToServerOnly(start: string, graph: ClientGraph): string[] | undefined {
  const queue: string[][] = [[start]];
  const visited = new Set<string>();

  for (const chain of queue) {
    const file = chain.at(-1);
    if (!file || visited.has(file)) continue;
    visited.add(file);

    const module = graph.modules.get(file);
    if (!module) continue;
    if (module.serverOnly) return chain;

    for (const imported of module.imports) {
      if (!visited.has(imported)) queue.push([...chain, imported]);
    }
  }
  return undefined;
}

export const serverClientBoundaryRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Prevent client dependency graphs and shared support barrels from reaching server-only modules.",
    },
  },
  create(context) {
    const file = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    const graph = getClientGraph(sourceRoot);
    const module = graph?.modules.get(file);
    const clientEntry = module?.client === true;
    const sharedEntry = isSupportEntry(file);
    const serverEntry = isServerEntry(file);
    if (!graph || !module || (!clientEntry && !sharedEntry && !serverEntry)) return {};

    return {
      Program(node) {
        if (serverEntry) {
          const hasMarker = context.sourceCode.ast.body.some(
            (statement) => statement.type === "ImportDeclaration" && statement.source.value === "server-only",
          );
          if (!hasMarker) {
            context.report({
              node,
              message: `A support server.ts entry MUST import "server-only" to enforce its Next.js server boundary. See ${DOC}`,
            });
          }
        }

        if (!clientEntry && !sharedEntry) return;
        const chain = pathToServerOnly(file, graph);
        if (!chain) return;
        const display = chain.map((entry) => path.relative(sourceRoot, entry).replaceAll("\\\\", "/")).join(" -> ");
        context.report({
          node,
          message: `${clientEntry ? "Client entry" : "Shared support barrel"} reaches server-only code: ${display}. Separate shared and server entry points. See ${DOC}`,
        });
      },
    };
  },
};
