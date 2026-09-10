/**
 * ESLint rule: pasika/root-support-placement
 *
 * A pure function, type, schema, or constant with no consumer outside
 * src/app/ or a configuration module MUST live in the feature it represents,
 * not the matching root support folder. This mirrors component-placement's
 * zero-consumer fallback: root src/utils/, src/types/, src/schemas/, and
 * src/constants/ are earned by actual cross-feature reuse, and an app/-only
 * or config-only consumer never counts toward that CCF, the same way it never
 * counts toward a component's.
 *
 * @see docs/next-codebase-guide/rules/utilities-rule.md
 * @see docs/next-codebase-guide/rules/types-and-schemas-rule.md
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type { ExportKind } from "../project/parse-module";
import { getProjectIndex, symbolKey } from "../project/index";
import { isConfigModule, isUnderApp, segmentsOf } from "../project/ccf";
import { sourceRootOf } from "./project-root";

type RootFolder = "utils" | "types" | "schemas" | "constants";

function isRootFolder(value: string | undefined): value is RootFolder {
  return value === "utils" || value === "types" || value === "schemas" || value === "constants";
}

const TYPES_AND_SCHEMAS_DOC = "docs/next-codebase-guide/rules/types-and-schemas-rule.md";

// The one kind of export each root support folder is expected to hold, the
// label for that kind, and the doc that states the requirement for it. Keyed
// by folder, not by export kind, so every lookup below is total over the
// already-narrowed RootFolder type — no fallback branch is ever needed.
const KIND_FOR_ROOT_FOLDER: Record<RootFolder, ExportKind> = {
  utils: "function",
  types: "type",
  schemas: "schema",
  constants: "constant",
};

const LABEL_FOR_ROOT_FOLDER: Record<RootFolder, string> = {
  utils: "Function",
  types: "Type",
  schemas: "Schema",
  constants: "Constant",
};

const DOC_FOR_ROOT_FOLDER: Record<RootFolder, string> = {
  utils: "docs/next-codebase-guide/rules/utilities-rule.md",
  types: TYPES_AND_SCHEMAS_DOC,
  schemas: TYPES_AND_SCHEMAS_DOC,
  constants: "docs/next-codebase-guide/rules/constants-rule.md",
};

export const rootSupportPlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require a root support-folder export to have a consumer outside src/app/ and configuration modules.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    // Only a root support folder is in scope — a feature's own support folder
    // already lives inside the feature it serves.
    const rootFolder = segments[0];
    if (!isRootFolder(rootFolder)) return {};
    const expectedKind = KIND_FOR_ROOT_FOLDER[rootFolder];
    const doc = DOC_FOR_ROOT_FOLDER[rootFolder];

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const module = index.modules.get(file);
    if (!module) return {};

    const findings: { line: number; message: string }[] = [];

    for (const exp of module.exports) {
      if (exp.kind !== expectedKind) continue;

      const consumers = [...(index.symbolConsumers.get(symbolKey(file, exp.name)) ?? [])];
      if (consumers.length === 0) continue;

      const real = consumers.filter((consumer) => {
        const consumerSegments = segmentsOf(consumer, sourceRoot);
        return !isUnderApp(consumerSegments) && !isConfigModule(consumerSegments);
      });
      if (real.length > 0) continue;

      const label = LABEL_FOR_ROOT_FOLDER[rootFolder];
      findings.push({
        line: exp.line,
        message:
          `${label} "${exp.name}" has no consumer outside src/app/ or a configuration module, so it has not ` +
          `earned root src/${rootFolder}/; move it into the feature it represents. If no existing feature ` +
          `applies, introduce a new feature folder. See ${doc}`,
      });
    }

    if (findings.length === 0) return {};

    return {
      Program(node) {
        for (const finding of findings) {
          context.report({ node, loc: { line: finding.line, column: 0 }, message: finding.message });
        }
      },
    };
  },
};
