/**
 * ESLint rules for Next.js App Router server/client module boundaries.
 *
 * @see docs/next-codebase-guide/rules/client-boundary-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { getClientGraph, isRequiredClientCapability } from "../project/client-boundary-graph";
import { sourceRootOf } from "./project-root";

const RULE_DOC = "See docs/next-codebase-guide/rules/client-boundary-rule.md";

function isErrorBoundary(file: string, sourceRoot: string): boolean {
  const rel = path.relative(sourceRoot, file).replaceAll("\\", "/");
  return rel.startsWith("app/") && /(?:^|\/)(?:error|global-error)\.[cm]?[jt]sx?$/u.test(rel);
}

function isAppEntry(file: string, sourceRoot: string): boolean {
  const rel = path.relative(sourceRoot, file).replaceAll("\\", "/");
  return (
    rel.startsWith("app/") && /(?:^|\/)(?:page|layout|template|loading|not-found|default)\.[cm]?[jt]sx?$/u.test(rel)
  );
}

export const requireClientBoundaryRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a client boundary for server-reachable client-only behavior and Next.js error files.",
    },
  },
  create(context) {
    const file = path.resolve(context.filename);
    const root = sourceRootOf(context);
    const graph = getClientGraph(root);
    const module = graph?.modules.get(file);
    if (!graph || !module) return {};

    return {
      Program(node) {
        if (isErrorBoundary(file, root)) {
          if (!module.client) {
            context.report({
              node,
              loc: { line: 1, column: 0 },
              message: `Next.js App Router error boundaries require "use client" as the first directive. ${RULE_DOC}`,
            });
          }
          return;
        }
        if (module.client || !graph.serverReachable.has(file) || !module.clientSignal) return;
        context.report({
          node,
          loc: { line: 1, column: 0 },
          message:
            `Client-only behavior is reachable from a Server Component without a "use client" boundary. ` +
            `Place the boundary on the smallest appropriate client entry component. ${RULE_DOC}`,
        });
      },
    };
  },
};

export const noRedundantClientBoundaryRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Disallow demonstrably redundant client directives inside an existing boundary or on server-compatible UI.",
    },
  },
  create(context) {
    const file = path.resolve(context.filename);
    const root = sourceRootOf(context);
    const graph = getClientGraph(root);
    const module = graph?.modules.get(file);
    if (!graph || !module?.client || isErrorBoundary(file, root)) return {};

    return {
      Program(node) {
        const consumers = [...module.consumers];
        const entry = isAppEntry(file, root);

        // Library entry points and currently unused components might be exposed
        // elsewhere. We cannot prove their directives unnecessary.
        if (!entry && consumers.length === 0) return;

        const serverReachable = graph.serverReachable.has(file);
        if (
          !entry &&
          !serverReachable &&
          consumers.length > 0 &&
          consumers.every(
            (consumer) =>
              graph.clientReachable.has(consumer) &&
              (!graph.serverReachable.has(consumer) || graph.modules.get(consumer)?.client),
          )
        ) {
          context.report({
            node,
            loc: { line: 1, column: 0 },
            message: `"use client" is redundant: all runtime consumers are already inside a client dependency graph. ${RULE_DOC}`,
          });
          return;
        }
        // The source and its non-boundary runtime dependencies are demonstrably
        // server-compatible. Unknown third-party runtime imports prevent advice.
        if (!isRequiredClientCapability(file, graph.modules)) {
          context.report({
            node,
            loc: { line: 1, column: 0 },
            message: `"use client" is unnecessary for this server-compatible module and its runtime dependencies. ${RULE_DOC}`,
          });
        }
      },
    };
  },
};
