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
import { getProjectIndex, type ProjectIndex, resolveSpecifier, symbolKey } from "../project/index";
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

/** A runtime named import can reach its declaration through one or more barrels. */
function importsConstant(consumer: string, target: string, name: string, index: ProjectIndex): boolean {
  const visited = new Set<string>();
  const reachesTarget = (file: string): boolean => {
    if (file === target) return true;
    if (visited.has(file)) return false;
    visited.add(file);
    return (
      index.modules.get(file)?.reexports.some((entry) => {
        if (entry.names.length > 0 && !entry.names.includes(name)) return false;
        if (entry.typeOnlyNames?.includes(name)) return false;
        const next = resolveSpecifier(file, entry.specifier, index.sourceRoot);
        return next !== undefined && reachesTarget(next);
      }) ?? false
    );
  };
  return (
    index.modules.get(consumer)?.imports.some((entry) => {
      if (!entry.names.includes(name) || entry.typeOnlyNames?.includes(name)) return false;
      const imported = resolveSpecifier(consumer, entry.specifier, index.sourceRoot);
      return imported !== undefined && reachesTarget(imported);
    }) ?? false
  );
}

/** API contracts must be exported and imported even for a single caller. */
function apiContractNames(context: Rule.RuleContext): Set<string> {
  const factoryNames = new Set<string>();
  const contracts = new Set<string>();
  for (const statement of context.sourceCode.ast.body) {
    if (statement.type !== "ImportDeclaration" || statement.source.value !== "pasika/api-contract") continue;
    for (const specifier of statement.specifiers) {
      if (
        specifier.type === "ImportSpecifier" &&
        specifier.imported.type === "Identifier" &&
        specifier.imported.name === "defineApiContract"
      ) {
        factoryNames.add(specifier.local.name);
      }
    }
  }
  for (const statement of context.sourceCode.ast.body) {
    if (statement.type !== "ExportNamedDeclaration" || statement.declaration?.type !== "VariableDeclaration") continue;
    for (const declaration of statement.declaration.declarations) {
      if (
        declaration.id.type === "Identifier" &&
        declaration.init?.type === "CallExpression" &&
        declaration.init.callee.type === "Identifier" &&
        factoryNames.has(declaration.init.callee.name)
      ) {
        contracts.add(declaration.id.name);
      }
    }
  }
  return contracts;
}

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

    // Inspect exported constants individually. A single source consumer
    // does not justify extraction, regardless of whether it is a component,
    // hook or utility. Configuration-owned values and app entry points retain
    // their existing placement exceptions.
    const localFindings: { name: string; line: number; message: string }[] = [];
    if (supportFolder === "constants" && !isConfigModule(segmentsOf(supportFile, sourceRoot))) {
      const supportModule = index.modules.get(supportFile);
      const exports = supportModule?.exports.filter((entry) => entry.kind === "constant") ?? [];
      const featureSegments = segmentsOf(supportFile, sourceRoot);

      const contracts = apiContractNames(context);
      for (const entry of exports) {
        if (contracts.has(entry.name) || supportModule?.localValueReferences.includes(entry.name)) continue;
        const consumers = [...(index.symbolConsumers.get(symbolKey(supportFile, entry.name)) ?? [])];
        if (consumers.length === 0) continue;

        // Preserve component ownership detection, including consumers that
        // import a constant alongside the component. Do this first to retain
        // the existing diagnostic for component-owned values.
        const componentOwner =
          featureSegments[0] === "features" && path.basename(supportFile) === "index.ts"
            ? consumers.find((owner) => {
                const ownerSegments = segmentsOf(owner, sourceRoot);
                if (ownerSegments[0] !== "features" || ownerSegments[1] !== featureSegments[1]) return false;
                if (!importsConstant(owner, supportFile, entry.name, index)) return false;
                return index.modules.get(owner)?.exports.some((exported) => {
                  if (exported.kind !== "component") return false;
                  const componentConsumers = index.symbolConsumers.get(symbolKey(owner, exported.name));
                  return consumers.every((consumer) => consumer === owner || componentConsumers?.has(consumer));
                });
              })
            : undefined;
        if (componentOwner) {
          const component = index.modules.get(componentOwner)?.exports.find((exported) => {
            if (exported.kind !== "component") return false;
            const componentConsumers = index.symbolConsumers.get(symbolKey(componentOwner, exported.name));
            return consumers.every((consumer) => consumer === componentOwner || componentConsumers?.has(consumer));
          });
          if (component) {
            localFindings.push({
              name: entry.name,
              line: entry.line,
              message:
                `${entry.name} is consumed only alongside ${component.name} (${describeConsumers([componentOwner], sourceRoot)}); ` +
                "declare it beside its owning component instead of extracting a constants/ folder. " +
                "See docs/next-codebase-guide/rules/constants-rule.md",
            });
            continue;
          }
        }

        const [owner] = consumers;
        if (consumers.length !== 1 || !owner || owner === supportFile) continue;
        const ownerSegments = segmentsOf(owner, sourceRoot);
        if (ownerSegments[0] === "app" || isConfigModule(ownerSegments)) continue;
        if (!importsConstant(owner, supportFile, entry.name, index)) continue;
        localFindings.push({
          name: entry.name,
          line: entry.line,
          message:
            `${entry.name} has only one source consumer (${describeConsumers([owner], sourceRoot)}); ` +
            "declare it in that file instead of extracting a constants/ folder. " +
            "See docs/next-codebase-guide/rules/constants-rule.md",
        });
      }
    }

    const reportLocal = (node: Parameters<NonNullable<Rule.RuleListener["Program"]>>[0]): void => {
      for (const finding of localFindings) {
        context.report({ node, loc: { line: finding.line, column: 0 }, message: finding.message });
      }
    };

    let placement = resolveSupportPlacement(supportFile, supportFolder, index);
    const groupedExportKind = EXPORT_KIND_BY_SUPPORT_FOLDER.get(supportFolder);
    if (groupedExportKind !== undefined) {
      const utilityExports =
        index.modules
          .get(supportFile)
          ?.exports.filter(
            (entry) =>
              entry.kind === groupedExportKind && !localFindings.some((finding) => finding.name === entry.name),
          ) ?? [];
      if (utilityExports.length === 0 && localFindings.length > 0) return { Program: reportLocal };
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
            reportLocal(node);
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
      else if (localFindings.length > 0) return { Program: reportLocal };
    }

    if (!placement || sameFolder(currentFolder, placement.expectedFolder)) return { Program: reportLocal };

    // A type or constant whose meaning comes from a configuration may stay with
    // it however widely it is used, so consumers outside the module cannot place
    // it — but when every consumer sits in a single configuration module, that
    // module owns it and the file must move to that module's own support folder.
    if (isConfigModule(segmentsOf(supportFile, sourceRoot)) && CONFIG_OWNED_FOLDERS.has(supportFolder)) {
      if (placement.reason !== "config-module") return {};
    }

    return {
      Program(node) {
        reportLocal(node);
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
