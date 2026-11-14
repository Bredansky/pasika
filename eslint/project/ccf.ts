import fs from "node:fs";
import path from "node:path";
import type { ProjectIndex } from "./index";
import { resolveSpecifier } from "./index";

export const SUPPORT_FOLDERS = new Set(["hooks", "types", "schemas", "constants", "utils"]);

/** Path of a file relative to the source root, as segments. */
export function segmentsOf(file: string, sourceRoot: string): string[] {
  const relative = path.relative(sourceRoot, file);
  return relative.startsWith("..") ? [] : relative.split(path.sep);
}

/** Folder of a file relative to the source root, as segments. */
export function folderSegmentsOf(file: string, sourceRoot: string): string[] {
  return segmentsOf(file, sourceRoot).slice(0, -1);
}

export const isUnderApp = (segments: string[]): boolean => segments[0] === "app";
export const isConfigModule = (segments: string[]): boolean => segments[0] === "config";
export const isUnderCompositions = (segments: string[]): boolean => segments[0] === "compositions";

/**
 * Whether one consumer places a support file. A route or a page under `src/app/`
 * is an entry point rather than a reuse site, so it never does, and neither does
 * a file outside the source root.
 */
export function isPlacingConsumer(consumer: string, sourceRoot: string): boolean {
  const segments = segmentsOf(consumer, sourceRoot);
  return segments.length > 0 && !isUnderApp(segments);
}

/** The longest folder prefix every path shares. */
function commonPrefix(folders: string[][]): string[] {
  if (folders.length === 0) return [];
  const [first = []] = folders;
  const shared: string[] = [];
  for (const [depth, segment] of first.entries()) {
    if (!folders.every((folder) => folder[depth] === segment)) break;
    shared.push(segment);
  }
  return shared;
}

/** Walks out of any trailing support folders, since a component never lives in one. */
function outOfSupportFolders(folder: string[]): string[] {
  const result = [...folder];
  while (result.length > 0 && SUPPORT_FOLDERS.has(result[result.length - 1] ?? "")) result.pop();
  return result;
}

/**
 * Follow component re-export barrels to the actual importers. A barrel is a
 * routing convenience rather than a component consumer, and test files do not
 * establish production ownership.
 */
export function componentConsumers(componentFile: string, index: ProjectIndex): string[] {
  const consumers = new Set<string>();
  const visited = new Set<string>();

  const visit = (file: string): void => {
    if (visited.has(file)) return;
    visited.add(file);

    for (const consumer of index.consumers.get(file) ?? []) {
      if (/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path.basename(consumer))) continue;
      const module = index.modules.get(consumer);
      const barrelReexportsTarget =
        path.parse(consumer).name === "index" &&
        module?.reexports.some((reexport) => resolveSpecifier(consumer, reexport.specifier, index.sourceRoot) === file);
      if (barrelReexportsTarget) {
        visit(consumer);
      } else {
        consumers.add(consumer);
      }
    }
  };

  visit(componentFile);
  return [...consumers];
}

export interface ComponentPlacement {
  /** Consumers that count toward the calculation, as absolute paths. */
  countedConsumers: string[];
  /** Folder the component belongs in, relative to the source root. */
  expectedFolder: string[];
  /** Why the expected folder is what it is, for the report. */
  reason: "ccf" | "across-features" | "across-layers";
}

/**
 * Resolves where a component belongs from the files that import it.
 *
 * Imports from `src/app/` and configuration modules drop out. Composition
 * consumers cannot move a feature/shared component into compositions or narrow
 * feature placement beyond its feature root. Composition components count
 * composition consumers only when no other consumers exist.
 * A CCF of `src/features/` becomes `src/shared/`. Undefined means no consumers
 * establish placement; the feature-ownership requirement applies instead.
 */
export function resolveComponentPlacement(componentFile: string, index: ProjectIndex): ComponentPlacement | undefined {
  const consumers = componentConsumers(componentFile, index);
  const relevant = consumers.filter((consumer) => {
    const segments = segmentsOf(consumer, index.sourceRoot);
    return segments.length > 0 && !isUnderApp(segments) && !isConfigModule(segments);
  });

  if (relevant.length === 0) return undefined;

  const ownSegments = segmentsOf(componentFile, index.sourceRoot);
  const ownFeature = ownSegments[0] === "features" ? ownSegments[1] : undefined;
  const compositionConsumers = relevant.filter((consumer) =>
    isUnderCompositions(segmentsOf(consumer, index.sourceRoot)),
  );
  const outsideCompositions = relevant.filter(
    (consumer) => !isUnderCompositions(segmentsOf(consumer, index.sourceRoot)),
  );

  if (compositionConsumers.length > 0 && outsideCompositions.length === 0) {
    if (ownFeature) return undefined;
    if (ownSegments[0] === "shared") {
      return { countedConsumers: relevant, expectedFolder: ["shared"], reason: "ccf" };
    }
  }

  const counted = outsideCompositions.length > 0 ? outsideCompositions : relevant;
  const shared = outOfSupportFolders(
    commonPrefix(counted.map((consumer) => folderSegmentsOf(consumer, index.sourceRoot))),
  );

  if (ownFeature && compositionConsumers.length > 0 && shared[0] === "features" && shared[1] === ownFeature) {
    return { countedConsumers: relevant, expectedFolder: ["features", ownFeature], reason: "ccf" };
  }

  // A shared folder of `features` or of the source root itself means no single
  // feature owns the component, so it belongs to the shared layer.
  if (shared.length === 1 && shared[0] === "features") {
    return { countedConsumers: counted, expectedFolder: ["shared"], reason: "across-features" };
  }
  if (shared.length === 0) {
    return { countedConsumers: counted, expectedFolder: ["shared"], reason: "across-layers" };
  }

  return { countedConsumers: counted, expectedFolder: shared, reason: "ccf" };
}

export const formatFolder = (folder: string[]): string => `src/${folder.join("/")}/`;

/** Whether a directory contains an entry with exactly this spelling and casing. */
export function hasExactEntry(directory: string, entryName: string): boolean {
  try {
    return fs.readdirSync(directory).includes(entryName);
  } catch {
    return false;
  }
}

/** Whether a folder contains its exactly same-named component owner. */
export function hasComponentOwner(folderPath: string, folderName: string): boolean {
  return hasExactEntry(folderPath, `${folderName}.tsx`);
}

/** Whether a folder is a structurally valid named component folder. */
function isValidComponentFolder(folder: string[], sourceRoot: string): boolean {
  const name = folder[folder.length - 1];
  if (!name || SUPPORT_FOLDERS.has(name)) return false;
  const folderPath = path.join(sourceRoot, ...folder);
  return hasComponentOwner(folderPath, name) && hasExactEntry(folderPath, "index.ts");
}

/**
 * The folder that owns a consumer: its own folder, stepped out of support
 * folders and invalid grouping folders. A non-support folder is a component
 * scope only when the application structure proves it is a named component
 * folder; this keeps a non-component grouping folder from changing a support
 * file's CCF.
 */
function owningFolderOf(consumer: string, sourceRoot: string): string[] {
  const result = outOfSupportFolders(folderSegmentsOf(consumer, sourceRoot));
  const [topLevel] = result;
  let minimumDepth = result.length;
  if (topLevel === "features") minimumDepth = 2;
  if (topLevel === "compositions" || topLevel === "shared") minimumDepth = 1;
  while (result.length > minimumDepth && !isValidComponentFolder(result, sourceRoot)) result.pop();
  return result;
}

/** The configuration module a file belongs to. `config/<name>/...` only: `config/<file>.ts` is not a module. */
const configModuleOf = (segments: string[]): string | undefined =>
  isConfigModule(segments) && segments.length >= 3 ? segments[1] : undefined;

export interface SupportPlacement {
  countedConsumers: string[];
  expectedFolder: string[];
  reason: "config-module" | "ccf" | "across-features" | "across-layers";
}

/**
 * Resolves where a support file belongs from the files that import it.
 *
 * A consumer inside a support folder is owned by that folder's parent, so the
 * calculation lands on the scope that uses the file rather than on a sibling
 * support folder. Consumers under `src/app/` never place a file — a route or a
 * page is an entry point, not a reuse site — so an app-only support file belongs
 * to the feature it represents, which `root-support-placement` states instead.
 * A set of consumers inside one configuration module keeps the file in that
 * module, and consumers spanning features land in the root support folder.
 */
export function resolveSupportPlacement(
  supportFile: string,
  supportFolder: string,
  index: ProjectIndex,
  importedBy: Iterable<string> = index.consumers.get(supportFile) ?? [],
): SupportPlacement | undefined {
  const consumers = [...importedBy].filter((consumer) => isPlacingConsumer(consumer, index.sourceRoot));
  if (consumers.length === 0) return undefined;

  const consumerSegments = consumers.map((consumer) => segmentsOf(consumer, index.sourceRoot));

  const configModules = new Set(consumerSegments.map((segments) => configModuleOf(segments)));
  const [onlyConfigModule] = [...configModules];
  if (configModules.size === 1 && onlyConfigModule !== undefined) {
    return {
      countedConsumers: consumers,
      expectedFolder: ["config", onlyConfigModule, supportFolder],
      reason: "config-module",
    };
  }

  const shared = commonPrefix(consumers.map((consumer) => owningFolderOf(consumer, index.sourceRoot)));

  if (shared.length === 1 && shared[0] === "features") {
    return { countedConsumers: consumers, expectedFolder: [supportFolder], reason: "across-features" };
  }
  if (shared.length === 0) {
    return { countedConsumers: consumers, expectedFolder: [supportFolder], reason: "across-layers" };
  }

  return { countedConsumers: consumers, expectedFolder: [...shared, supportFolder], reason: "ccf" };
}

/**
 * Consumers for a message. A widely used file can have dozens, so the list is
 * capped: the point is to show where the requirement comes from, not to enumerate.
 */
export function describeConsumers(consumers: string[], sourceRoot: string): string {
  const shown = 3;
  const names = consumers
    .map((consumer) => path.relative(path.dirname(sourceRoot), consumer).split(path.sep).join("/"))
    .sort((left, right) => left.localeCompare(right));
  if (names.length <= shown) return names.join(", ");
  return `${names.slice(0, shown).join(", ")} and ${String(names.length - shown)} more`;
}
