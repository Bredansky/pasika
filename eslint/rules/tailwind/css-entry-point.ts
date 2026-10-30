/**
 * ESLint rule: pasika/css-entry-point
 *
 * A repository has exactly one global stylesheet entry point at
 * `src/app/styles/globals.css` — the stylesheet that registers Tailwind with
 * `@import "tailwindcss"` — and every project stylesheet lives under
 * `src/app/styles/`. Only the root layout imports the entry point, which
 * directly imports every other project stylesheet (even import-only files).
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
import { buildStylesheetGraph, resolveSpecifier } from "./stylesheet-graph";

const APP_STYLES_DIR = path.join("app", "styles");
const GLOBAL_STYLESHEET_PATH = path.join(APP_STYLES_DIR, "globals.css");

export const cssEntryPointRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require the app/styles CSS root, one global entry point, and direct imports for every project stylesheet.",
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
    const { globals, directChildren } = graph;

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        // Without an entry point, `global-stylesheet` reports the missing
        // registration; there is no graph to build against here.
        if (globals.length === 0) return;

        const current = path.normalize(path.resolve(context.filename));
        const relative = path.relative(sourceRoot, current);

        if (globals.includes(current)) {
          if (globals.length > 1) {
            context.report({
              node,
              message: "Only one stylesheet may register Tailwind as the global entry point.",
            });
            return;
          }
          if (relative !== GLOBAL_STYLESHEET_PATH) {
            context.report({
              node,
              message: "The global stylesheet entry point must be src/app/styles/globals.css.",
            });
            return;
          }

          const importers = moduleFiles.filter((modulePath) => {
            const source = textOf(modulePath);
            for (const match of source.matchAll(
              /\b(?:import\s*(?:[^"'`;]*?\bfrom\s*)?|require\s*\(\s*)["'](?<specifier>[^"']+\.css)["']/gu,
            )) {
              const specifier = match.groups?.specifier;
              if (!specifier) continue;
              const resolved = resolveSpecifier(modulePath, specifier, sourceRoot);
              if (resolved && path.normalize(resolved) === current) return true;
            }
            return false;
          });
          const importCount = importers.length;
          if (importCount !== 1) {
            context.report({
              node,
              message:
                `The global stylesheet entry point must be imported by exactly one module ` +
                `(the root layout), but it is imported by ${String(importCount)} module(s).`,
            });
          } else {
            const importer = importers[0];
            const isRootLayout =
              importer !== undefined &&
              path.dirname(importer) === path.join(sourceRoot, "app") &&
              /^layout\.(?:[cm]?[jt]sx?)$/u.test(path.basename(importer));
            if (!isRootLayout) {
              context.report({
                node,
                message: "The global stylesheet entry point must be imported by src/app/layout, not another module.",
              });
            }
          }
          return;
        }

        const isInAppStyles = relative === APP_STYLES_DIR || relative.startsWith(`${APP_STYLES_DIR}${path.sep}`);
        if (!isInAppStyles) {
          context.report({
            node,
            message: "Project stylesheets must live under src/app/styles/.",
          });
          return;
        }

        if (!directChildren.has(current)) {
          context.report({
            node,
            message: "Every project stylesheet must be imported directly by src/app/styles/globals.css.",
          });
        }
      },
    };
  },
};
