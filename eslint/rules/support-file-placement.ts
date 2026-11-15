/**
 * ESLint rule: pasika/support-file-placement
 *
 * Enforces where a hook, type, schema, constant, or utility lives, which depends
 * on the files that import it and so cannot be decided from one file.
 *
 * @see docs/next-codebase-guide/rules/types-and-schemas-rule.md
 * @see docs/next-codebase-guide/rules/constants-rule.md
 * @see docs/next-codebase-guide/rules/utilities-rule.md
 * @see docs/next-codebase-guide/rules/hook-extraction-rule.md
 * @see docs/next-codebase-guide/rules/configuration-rule.md
 * @see docs/next-codebase-guide/rules/folder-nesting-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import {
  describeConsumers,
  folderSegmentsOf,
  formatFolder,
  isConfigModule,
  resolveSupportPlacement,
  segmentsOf,
  SUPPORT_FOLDERS,
} from "../project/ccf";
import { getProjectIndex, isTestConsumer, symbolKey } from "../project/index";
import type { ExportKind } from "../project/parse-module";
import { sourceRootOf } from "./project-root";

/**
 * Support folders a configuration module keeps regardless of who imports them: a
 * constant or type whose meaning is derived from the configuration stays beside
 * it even when consumers exist outside the module.
 */
const CONFIG_OWNED_FOLDERS = new Set(["types", "constants"]);
const EXPORT_KIND_BY_SUPPORT_FOLDER = new Map<string, ExportKind>([
  ["constants", "constant"],

  ["schemas", "schema"],
  ["types", "type"],
  ["utils", "function"],
]);

const REASON_TEXT: Record<string, string> = {
  "config-module": "every file that imports it belongs to that configuration module",
  ccf: "that is the closest folder its consumers share",
  "across-features": "its consumers span more than one feature, so no feature can own it",
  "across-layers": "its consumers span more than one layer, so no layer can own it",
};

const sameFolder = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((segment, depth) => segment === right[depth]);

export const supportFilePlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce that a support file lives in the folder its consumers imply.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const supportFile = path.resolve(context.filename);
    const currentFolder = folderSegmentsOf(supportFile, sourceRoot);
    const supportFolder = currentFolder[currentFolder.length - 1];

    // Only a file already inside a support folder is placed by this rule; a
    // declaration still sitting beside its consumer is an extraction question.
    if (supportFolder === undefined || !SUPPORT_FOLDERS.has(supportFolder)) return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    // Inspect each constant independently, even when the module also exports
    // unrelated values. A consumer importing the component alongside the value
    // is not independent reuse; test-only and type-only imports do not establish
    // runtime ownership.
    if (supportFolder === "constants" && path.basename(supportFile) === "index.ts") {
      const exports = index.modules.get(supportFile)?.exports.filter((entry) => entry.kind === "constant") ?? [];
      const featureSegments = segmentsOf(supportFile, sourceRoot);
      const findings: { name: string; component: string; owner: string; line: number }[] = [];

      if (featureSegments[0] === "features") {
        for (const entry of exports) {
          const consumers = [...(index.symbolConsumers.get(symbolKey(supportFile, entry.name)) ?? [])].filter(
            (consumer) => !isTestConsumer(consumer),
          );
          if (consumers.length === 0) continue;

          for (const owner of consumers) {
            const ownerSegments = segmentsOf(owner, sourceRoot);
            if (ownerSegments[0] !== "features" || ownerSegments[1] !== featureSegments[1]) continue;
            const module = index.modules.get(owner);
            if (!module) continue;

            // A type-only use of an exported data object does not make that
            // object an implementation detail of the importing component.
            const runtimeImport = module.imports.some(
              (imported) => imported.names.includes(entry.name) && !imported.typeOnlyNames?.includes(entry.name),
            );
            if (!runtimeImport) continue;

            const component = module.exports
              .filter((exported) => exported.kind === "component")
              .find((exported) => {
                const componentConsumers = index.symbolConsumers.get(symbolKey(owner, exported.name));
                return consumers.every((consumer) => consumer === owner || componentConsumers?.has(consumer));
              });
            if (!component) continue;

            findings.push({ name: entry.name, component: component.name, owner, line: entry.line });
            break;
          }
        }
      }

      if (findings.length > 0) {
        return {
          Program(node) {
            for (const finding of findings) {
              context.report({
                node,
                loc: { line: finding.line, column: 0 },
                message:
                  `${finding.name} is consumed only alongside ${finding.component} (${describeConsumers(
                    [finding.owner],
                    sourceRoot,
                  )}); ` +
                  `declare it beside its owning component instead of extracting a constants/ folder. ` +
                  `See docs/next-codebase-guide/rules/constants-rule.md`,
              });
            }
          },
        };
      }
    }

    let placement = resolveSupportPlacement(supportFile, supportFolder, index);
    const groupedExportKind = EXPORT_KIND_BY_SUPPORT_FOLDER.get(supportFolder);
    if (groupedExportKind !== undefined) {
      const utilityExports =
        index.modules.get(supportFile)?.exports.filter((entry) => entry.kind === groupedExportKind) ?? [];
      const placements = utilityExports
        .map((entry) => {
          const consumers = new Set(index.symbolConsumers.get(symbolKey(supportFile, entry.name)) ?? []);
          // An exported value that another declaration in this module uses
          // cannot be relocated using only its external importers' CCF.
          // The module itself remains one of its direct owners.
          if (
            supportFolder === "constants" &&
            index.modules.get(supportFile)?.localValueReferences.includes(entry.name)
          ) {
            consumers.add(supportFile);
          }
          return {
            name: entry.name,
            placement: resolveSupportPlacement(supportFile, supportFolder, index, consumers),
          };
        })
        .filter(
          (entry): entry is { name: string; placement: NonNullable<typeof entry.placement> } =>
            entry.placement !== undefined,
        );
      const folders = new Set(placements.map((entry) => formatFolder(entry.placement.expectedFolder)));
      if (folders.size > 1) {
        return {
          Program(node) {
            context.report({
              node,
              loc: { line: 1, column: 0 },
              message: `Split ${supportFolder} exports with different CCFs: ${placements.map((entry) => `${entry.name} → ${formatFolder(entry.placement.expectedFolder)}`).join(", ")}.`,
            });
          },
        };
      }
      const [firstPlacement] = placements;
      if (firstPlacement !== undefined) placement = firstPlacement.placement;
    }

    if (!placement || sameFolder(currentFolder, placement.expectedFolder)) return {};

    // A type or constant whose meaning comes from a configuration may stay with
    // it however widely it is used, so consumers outside the module cannot place
    // it — but when every consumer sits in a single configuration module, that
    // module owns it and the file must move to that module's own support folder.
    if (isConfigModule(segmentsOf(supportFile, sourceRoot)) && CONFIG_OWNED_FOLDERS.has(supportFolder)) {
      if (placement.reason !== "config-module") return {};
    }

    return {
      Program(node) {
        context.report({
          node,
          loc: { line: 1, column: 0 },
          message:
            `Move this file to ${formatFolder(placement.expectedFolder)} — ` +
            `${REASON_TEXT[placement.reason] ?? "that is where its consumers place it"}. ` +
            `Imported by ${describeConsumers(placement.countedConsumers, sourceRoot)}.`,
        });
      },
    };
  },
};
