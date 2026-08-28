import path from "node:path";
import type { ProjectIndex } from "./index";

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
 * Imports from `src/app/` and from configuration modules drop out, consumers
 * under `src/compositions/` count only when every consumer is there, and a
 * result of `src/features/` becomes `src/shared/` because no feature may import
 * from another. Returns undefined when no consumer counts, which is the case the
 * "lives in the feature it represents" requirement covers instead.
 */
export function resolveComponentPlacement(componentFile: string, index: ProjectIndex): ComponentPlacement | undefined {
  const consumers = [...(index.consumers.get(componentFile) ?? [])];
  const relevant = consumers.filter((consumer) => {
    const segments = segmentsOf(consumer, index.sourceRoot);
    return segments.length > 0 && !isUnderApp(segments) && !isConfigModule(segments);
  });

  if (relevant.length === 0) return undefined;

  const outsideCompositions = relevant.filter(
    (consumer) => !isUnderCompositions(segmentsOf(consumer, index.sourceRoot)),
  );
  const counted = outsideCompositions.length > 0 ? outsideCompositions : relevant;

  const shared = outOfSupportFolders(
    commonPrefix(counted.map((consumer) => folderSegmentsOf(consumer, index.sourceRoot))),
  );

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

/** The folder that owns a consumer: its own folder, stepped out of any support folder. */
function owningFolderOf(consumer: string, sourceRoot: string): string[] {
  return outOfSupportFolders(folderSegmentsOf(consumer, sourceRoot));
}

/** The configuration module a file belongs to. `config/<name>/...` only: `config/<file>.ts` is not a module. */
const configModuleOf = (segments: string[]): string | undefined =>
  isConfigModule(segments) && segments.length >= 3 ? segments[1] : undefined;

export interface SupportPlacement {
  countedConsumers: string[];
  expectedFolder: string[];
  reason: "app-consumer" | "config-module" | "ccf" | "across-features" | "across-layers";
}

/**
 * Resolves where a support file belongs from the files that import it.
 *
 * A consumer inside a support folder is owned by that folder's parent, so the
 * calculation lands on the scope that uses the file rather than on a sibling
 * support folder. A consumer under `src/app/` forces the root support folder, a
 * set of consumers inside one configuration module keeps the file in that module,
 * and consumers spanning features land in the root support folder.
 */
export function resolveSupportPlacement(
  supportFile: string,
  supportFolder: string,
  index: ProjectIndex,
): SupportPlacement | undefined {
  const consumers = [...(index.consumers.get(supportFile) ?? [])].filter(
    (consumer) => segmentsOf(consumer, index.sourceRoot).length > 0,
  );
  if (consumers.length === 0) return undefined;

  const consumerSegments = consumers.map((consumer) => segmentsOf(consumer, index.sourceRoot));

  if (consumerSegments.some((segments) => isUnderApp(segments))) {
    return { countedConsumers: consumers, expectedFolder: [supportFolder], reason: "app-consumer" };
  }

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
