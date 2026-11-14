import path from "node:path";
import { segmentsOf } from "./ccf";
import type { ProjectIndex } from "./index";
import { resolveSpecifier } from "./index";

/** An exposed composition is flat or owns its named component folder. */
export function isCompositionRoot(segments: string[]): boolean {
  if (segments[0] !== "compositions") return false;
  if (segments.length === 2) return true;
  if (segments.length !== 3) return false;
  return segments[1] === path.parse(segments[2] ?? "").name;
}

/**
 * Collect distinct feature folders reachable through the composition's
 * imports (including barrels and child compositions). Only traverse the
 * compositions layer: a feature's internal dependencies do not turn unrelated
 * features into inputs of this composition.
 */
export function combinedFeatureFolders(componentFile: string, index: ProjectIndex): string[] {
  const features = new Set<string>();
  const visited = new Set<string>();

  const visit = (file: string): void => {
    if (visited.has(file)) return;
    visited.add(file);

    for (const moduleImport of index.modules.get(file)?.imports ?? []) {
      const target = resolveSpecifier(file, moduleImport.specifier, index.sourceRoot);
      if (!target) continue;
      const segments = segmentsOf(target, index.sourceRoot);
      if (segments[0] === "features" && segments[1]) {
        features.add(segments[1]);
      } else if (segments[0] === "compositions") {
        visit(target);
      }
    }
  };

  visit(componentFile);
  return [...features].sort();
}
