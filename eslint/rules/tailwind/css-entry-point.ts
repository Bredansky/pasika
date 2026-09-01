/**
 * ESLint rule: pasika/css-entry-point
 *
 * A repository has exactly one global stylesheet entry point — the stylesheet
 * that registers Tailwind with `@import "tailwindcss"` — and everything else
 * hangs off it. The entry point must be imported by exactly one module (the
 * root layout). Every other stylesheet must be reachable from the entry point
 * through `@import`, and one that holds project CSS must be imported by the
 * entry point *directly* — content arriving through a midpoint, or through no
 * path at all, cannot be seen to enter through one door.
 *
 * The rule builds the stylesheet import graph from disk (like
 * `unused-utility`), because a single stylesheet cannot see what other files
 * import it or what the entry point pulls in.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */

import { statSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";
import { buildStylesheetGraph, moduleImports } from "./stylesheet-graph";

export const cssEntryPointRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require one global entry point; project CSS only in a stylesheet it imports directly.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    let cssFiles: string[];
    let moduleFiles: string[];
    try {
      if (!statSync(sourceRoot).isDirectory()) return {};
      cssFiles = findFiles(sourceRoot, CSS_EXTENSIONS);
      moduleFiles = findFiles(sourceRoot, MODULE_EXTENSIONS);
    } catch {
      // No src/ tree: the rule is inert, like the other cross-file rules.
      return {};
    }

    const textOf = cachedTextReader();
    const graph = buildStylesheetGraph({ cssFiles, sourceRoot, textOf });
    const { globals, reachable, directChildren } = graph;

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        // Without an entry point, `global-stylesheet` reports the missing
        // registration; there is no graph to build against here.
        if (globals.length === 0) return;

        const current = path.normalize(path.resolve(context.filename));

        if (globals.includes(current)) {
          if (globals.length > 1) {
            context.report({
              node,
              message: "Only one stylesheet may register Tailwind as the global entry point.",
            });
            return;
          }

          const basename = path.basename(current);
          const importCount = moduleFiles.filter((modulePath) => moduleImports(textOf(modulePath), basename)).length;
          if (importCount !== 1) {
            context.report({
              node,
              message:
                `The global stylesheet entry point must be imported by exactly one module ` +
                `(the root layout), but it is imported by ${String(importCount)} module(s).`,
            });
          }
          return;
        }

        // Whether the current stylesheet defines project CSS (a declaration,
        // `@theme`, `@layer`, `:root`, etc.) as opposed to pure @import/comment.
        const hasProjectCss = node.children.some((child) => {
          if (child.type === "Atrule" && child.name === "import") return false;
          if (child.type === "Comment") return false;
          return true;
        });

        if (hasProjectCss && !directChildren.has(current)) {
          context.report({
            node,
            message:
              "Project CSS may only live in a stylesheet the global entry point imports directly; route it through a direct import or into the entry point.",
          });
          return;
        }

        if (!reachable.has(current)) {
          context.report({
            node,
            message:
              "This stylesheet must be imported by the global stylesheet entry point via @import, so CSS arrives through one door.",
          });
        }
      },
    };
  },
};