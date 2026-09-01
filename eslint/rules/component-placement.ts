/**
 * ESLint rule: pasika/component-placement
 *
 * Enforces the placement requirements from the "Component Placement Rule" by
 * reading the whole source tree, because where a component belongs depends on
 * which files import it — something a single-file pass cannot see.
 *
 * @see docs/next-codebase-guide/rules/component-placement-rule.md
 */

import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex } from "../project/index";
import {
  describeConsumers,
  folderSegmentsOf,
  formatFolder,
  isConfigModule,
  isUnderApp,
  resolveComponentPlacement,
  segmentsOf,
} from "../project/ccf";
import { sourceRootOf } from "./project-root";

const REASON_TEXT: Record<string, string> = {
  ccf: "that is the closest folder its consumers share",
  "across-features": "its consumers span more than one feature, and no feature may import from another",
  "across-layers": "its consumers span more than one layer, so no feature can own it",
};

const sameFolder = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((segment, depth) => segment === right[depth]);

/**
 * A component folder (a folder holding a same-named .tsx) may sit one level
 * inside the folder its consumers imply: stay-flat requires nesting a component
 * with exclusive children, and the nesting folder is the CCF plus the component
 * name. Without this, stay-flat and component-placement would contradict each
 * other for every nested component.
 */
function isNestedInside(expectedFolder: string[], currentFolder: string[], componentFile: string): boolean {
  if (currentFolder.length !== expectedFolder.length + 1) return false;
  if (!sameFolder(currentFolder.slice(0, -1), expectedFolder)) return false;
  const folderName = currentFolder[currentFolder.length - 1];
  if (!folderName) return false;
  return fs.existsSync(path.join(path.dirname(componentFile), `${folderName}.tsx`));
}

export const componentPlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce that a component lives in the folder its consumers imply.",
    },
  },
  create(context) {
    const filename = context.filename;
    if (!filename.endsWith(".tsx") && !filename.endsWith(".jsx")) return {};

    const sourceRoot = sourceRootOf(context);
    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const componentFile = path.resolve(filename);
    const segments = segmentsOf(componentFile, sourceRoot);
    if (segments.length === 0) return {};

    // Routing files and configuration modules are not placed by their consumers.
    if (isUnderApp(segments) || isConfigModule(segments)) return {};

    const module = index.modules.get(componentFile);
    if (!module?.exports.some((moduleExport) => moduleExport.kind === "component")) return {};

    const currentFolder = folderSegmentsOf(componentFile, sourceRoot);
    const placement = resolveComponentPlacement(componentFile, index);

    return {
      Program(node) {
        if (!placement) {
          // No consumer counts, so the component belongs to the feature it represents.
          if (segments[0] !== "features" || segments.length < 3) {
            context.report({
              node,
              loc: { line: 1, column: 0 },
              message:
                `This component has no consumer outside src/app/ or a configuration module, ` +
                `so it belongs in the feature folder it represents, not in ${formatFolder(currentFolder)}. ` +
                "See docs/next-codebase-guide/rules/component-placement-rule.md",
            });
          }
          return;
        }

        if (sameFolder(currentFolder, placement.expectedFolder)) return;
        if (isNestedInside(placement.expectedFolder, currentFolder, componentFile)) return;

        const explanation = REASON_TEXT[placement.reason] ?? "that is where its consumers place it";

        context.report({
          node,
          loc: { line: 1, column: 0 },
          message:
            `Move this component to ${formatFolder(placement.expectedFolder)} — ${explanation}. ` +
            `Imported by ${describeConsumers(placement.countedConsumers, sourceRoot)}. ` +
            "See docs/next-codebase-guide/rules/component-placement-rule.md",
        });
      },
    };
  },
};
