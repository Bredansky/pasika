/**
 * ESLint rule: pasika/feature-css-placement
 *
 * Mirrors locale-placement: utility ownership follows consumer features.
 * A monolithic globals.css is valid until a feature stylesheet is introduced.
 * Unknown lexical usage never forces a migration.
 *
 * @see docs/next-tailwind-guide/rules/global-stylesheet-rule.md
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { CSSRuleDefinition } from "@eslint/css";
import type { StyleSheetPlain } from "@eslint/css-tree";
import { sourceRootOf } from "../project-root";
import { buildCssDependencyGraph } from "./css-dependency-graph";
import type { CssDependencyGraph } from "./css-dependency-graph";
import { CSS_EXTENSIONS, MODULE_EXTENSIONS, cachedTextReader, findFiles } from "./source-files";

const STYLES_DIR = path.join("app", "styles");
const GLOBALS = "globals.css";
const FEATURE_CSS = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.css$/u;

function featureOf(filename: string, sourceRoot: string): string | undefined {
  const parts = path.relative(sourceRoot, filename).split(path.sep);
  return parts[0] === "features" && parts.length > 2 ? parts[1] : undefined;
}

/**
 * Only module references provide ownership evidence. A reference from outside
 * src/features or from multiple features means a global utility. Dynamic
 * classes may escape lexical discovery, so no uses means unknown, not unused.
 */
function ownerOfUtility(graph: CssDependencyGraph, name: string, sourceRoot: string): string | undefined {
  const uses = graph.references.filter(
    (reference) => reference.source === "module" && reference.kind === "utility" && reference.name === name,
  );
  if (uses.length === 0) return undefined;
  const features = new Set(uses.map((reference) => featureOf(reference.file, sourceRoot)));
  if (features.size === 1) return [...features][0] ?? GLOBALS;
  return GLOBALS;
}

export const featureCssPlacementRule: CSSRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Keep single-feature CSS utilities in feature stylesheets and cross-feature utilities global.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const current = path.normalize(path.resolve(context.filename));
    const relative = path.relative(sourceRoot, current);
    const styles = path.join(sourceRoot, STYLES_DIR);
    if (!relative.startsWith(`${STYLES_DIR}${path.sep}`)) return {};
    const basename = path.basename(current);
    const cssFiles = findFiles(sourceRoot, CSS_EXTENSIONS);
    const modules = findFiles(sourceRoot, MODULE_EXTENSIONS);
    const textOf = cachedTextReader();
    const graph = buildCssDependencyGraph({
      sourceRoot,
      css: cssFiles.map((file) => ({ path: file, content: textOf(file) })),
      modules: modules.map((file) => ({ path: file, content: textOf(file) })),
    });

    const featureName = basename.slice(0, -".css".length);
    const hasFeature = existsSync(path.join(sourceRoot, "features", featureName));
    const validName =
      relative === path.join(STYLES_DIR, GLOBALS) ||
      (path.dirname(current) === styles && FEATURE_CSS.test(basename) && hasFeature);
    const duplicateNames = new Set<string>();
    const names = new Set<string>();
    for (const def of graph.definitions) {
      if (def.kind !== "utility") continue;
      if (names.has(def.name)) duplicateNames.add(def.name);
      names.add(def.name);
    }

    return {
      "StyleSheet:exit"(node: StyleSheetPlain) {
        if (!validName) {
          context.report({
            node,
            message:
              "Project CSS must be in src/app/styles/globals.css or a flat <feature>.css matching src/features/<feature>/; no shared.css or type-based files.",
          });
          return;
        }

        for (const definition of graph.definitions) {
          if (definition.file !== current || definition.kind !== "utility" || duplicateNames.has(definition.name)) {
            continue;
          }
          const owner = ownerOfUtility(graph, definition.name, sourceRoot);
          if (owner === undefined) continue;
          const expected = owner === GLOBALS ? GLOBALS : `${owner}.css`;
          // Do not force the split of a valid globals-only project.
          if (basename === GLOBALS && expected !== GLOBALS && !existsSync(path.join(styles, expected))) continue;
          if (basename === expected) continue;
          context.report({
            node,
            loc: {
              start: { line: definition.line, column: 1 },
              end: { line: definition.line, column: 2 },
            },
            message: `CSS utility "${definition.name}" is consumed ${expected === GLOBALS ? "across feature scopes" : `only by feature "${owner}"`}; define it in ${expected}.`,
          });
        }
      },
    };
  },
};
