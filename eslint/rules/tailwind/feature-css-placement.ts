/**
 * ESLint rule: pasika/feature-css-placement
 *
 * Like locale-placement, declaration ownership follows consumers, including
 * transitive CSS dependencies. Unknown usage and global foundations remain
 * untouched. The rule reports only; moving CSS can alter its cascade.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph } from "./css-dependency-graph";
import { inferCssOwners, symbolId } from "./css-ownership";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const STYLES_DIR = path.join("app", "styles");
const GLOBALS = "globals.css";
const FEATURE_CSS = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.css$/u;
const LABELS: Record<string, string> = {
  utility: "utility",
  "theme-token": "theme token",
  "root-variable": "root variable",
  keyframes: "keyframes",
  "font-face": "font face",
  selector: "selector",
};

export const featureCssPlacementRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce ownership of CSS definitions and their transitive dependencies across feature scopes.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const relative = path.relative(sourceRoot, current);
    const styles = path.join(sourceRoot, STYLES_DIR);
    if (!relative.startsWith(`${STYLES_DIR}${path.sep}`)) return {};
    const basename = path.basename(current);
    const featureName = basename.slice(0, -".css".length);
    const isFeatureFile =
      path.dirname(current) === styles &&
      FEATURE_CSS.test(basename) &&
      existsSync(path.join(sourceRoot, "features", featureName));
    const read = cachedTextReader();
    const css = findFiles(sourceRoot, CSS_EXTENSIONS).map((file) => ({ path: file, content: read(file) }));
    const modules = findFiles(sourceRoot, MODULE_EXTENSIONS).map((file) => ({ path: file, content: read(file) }));
    const graph = buildCssDependencyGraph({ sourceRoot, css, modules });
    const owners = inferCssOwners({ graph, css, modules, sourceRoot });

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        for (const definition of graph.definitions) {
          if (definition.file !== current) continue;
          const owner = owners.get(symbolId(definition));
          if (!owner) continue;
          const expected = owner === GLOBALS ? GLOBALS : `${owner}.css`;
          // Without a feature stylesheet, unowned CSS need not be relocated.
          // A definition in another feature's stylesheet still has the wrong owner.
          if (
            owner !== GLOBALS &&
            (basename === GLOBALS || !isFeatureFile) &&
            !existsSync(path.join(styles, expected))
          ) {
            continue;
          }
          if (basename === expected) continue;
          const kind = LABELS[definition.kind] ?? definition.kind;
          context.report({
            node,
            loc: {
              start: { line: definition.line, column: 1 },
              end: { line: definition.line, column: 2 },
            },
            message: `CSS ${kind} "${definition.name}" is consumed ${owner === GLOBALS ? "across feature scopes" : `only by feature "${owner}"`}; define it in ${expected}.`,
          });
        }
      },
    };
  },
};
