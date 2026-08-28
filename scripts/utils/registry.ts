import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { parseDocs } from "./parse-docs";
import { registrySchema, type Registry, type Requirement } from "../types";

export function readRegistry(registryPath: string): Registry {
  const parsed: unknown = JSON.parse(readFileSync(registryPath, "utf8"));
  const result = registrySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`${registryPath} is not a valid enforcement registry:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/**
 * Sequence position of each requirement in the docs: doc order as `parseDocs`
 * yields it, then line order within each doc. Entries whose hash no longer
 * exists in the docs (removed, not yet accepted) sort after everything parsed.
 */
function buildDocOrder(docsRoot: string): Map<string, number> {
  const order = new Map<string, number>();
  let position = 0;
  for (const doc of parseDocs(docsRoot)) {
    for (const requirement of doc.requirements) {
      order.set(requirement.hash, position);
      position += 1;
    }
  }
  return order;
}

/**
 * Code-point order on doc then text. Deliberately not `localeCompare`, whose
 * result depends on the host's locale data — a generated file that is committed
 * has to sort the same way everywhere.
 */
function compareRequirements(left: Requirement, right: Requirement): number {
  if (left.doc !== right.doc) return left.doc < right.doc ? -1 : 1;
  if (left.text !== right.text) return left.text < right.text ? -1 : 1;
  return 0;
}

/**
 * Writes the registry sorted in the same order the requirements appear in the
 * docs: document order, then line order within each document.
 */
export function writeRegistry(registryPath: string, registry: Registry, docsRoot: string): void {
  const order = buildDocOrder(docsRoot);
  const withPosition = registry.requirements.map((requirement) => ({
    requirement,
    position: order.get(requirement.hash) ?? Number.MAX_SAFE_INTEGER,
  }));
  withPosition.sort((left, right) => {
    if (left.position !== right.position) return left.position - right.position;
    // Two entries with the same hash cannot coexist; this fallback orders
    // entries whose hash the docs no longer contain, deterministically.
    return compareRequirements(left.requirement, right.requirement);
  });
  const sorted: Registry = { requirements: withPosition.map((entry) => entry.requirement) };
  writeFileSync(registryPath, `${JSON.stringify(sorted, null, 2)}\n`);
}
