/**
 * ESLint rule: pasika/root-support-placement
 *
 * A pure function, type, schema, or constant with no consumer outside
 * src/app/ or a configuration module MUST live under src/features/<name>/, not
 * the matching root support folder or anywhere else. This mirrors
 * component-placement's zero-consumer fallback exactly, including the
 * mechanical part: that fallback does not just recommend a feature folder,
 * it checks the component already sits in one (`segments[0] !== "features"`).
 * Root src/utils/, src/types/, src/schemas/, and src/constants/ are earned by
 * actual cross-feature reuse, and an app/-only or config-only consumer never
 * counts toward that CCF, the same way it never counts toward a component's —
 * so a zero-consumer export sitting anywhere other than src/features/<name>/ is
 * exactly as wrong as one left in root. src/shared/ never validly absorbs it
 * either: neither the Utilities Rule, the Types and Schemas Rule, nor the
 * Constants Rule ever names src/shared/ as a destination, unlike the
 * Component Placement Rule's explicit use of it for cross-feature reuse.
 *
 * @see docs/next-codebase-guide/rules/utilities-rule.md
 * @see docs/next-codebase-guide/rules/types-and-schemas-rule.md
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import type { ExportKind } from "../project/parse-module";
import { getProjectIndex, symbolKey } from "../project/index";
import { folderSegmentsOf, isConfigModule, isUnderApp, segmentsOf } from "../project/ccf";
import { sourceRootOf } from "./project-root";

type SupportFolder = "utils" | "types" | "schemas" | "constants";

function isSupportFolder(value: string | undefined): value is SupportFolder {
  return value === "utils" || value === "types" || value === "schemas" || value === "constants";
}

const TYPES_AND_SCHEMAS_DOC = "docs/next-codebase-guide/rules/types-and-schemas-rule.md";

// The one kind of export each support folder is expected to hold, the label
// for that kind, and the doc that states the requirement for it. Keyed by
// folder, not by export kind, so every lookup below is total over the
// already-narrowed SupportFolder type — no fallback branch is ever needed.
const KIND_FOR_SUPPORT_FOLDER: Record<SupportFolder, ExportKind> = {
  utils: "function",
  types: "type",
  schemas: "schema",
  constants: "constant",
};

const LABEL_FOR_SUPPORT_FOLDER: Record<SupportFolder, string> = {
  utils: "Function",
  types: "Type",
  schemas: "Schema",
  constants: "Constant",
};

const DOC_FOR_SUPPORT_FOLDER: Record<SupportFolder, string> = {
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
        "Require a zero-consumer support-folder export to live under a feature folder, not root or elsewhere.",
    },
  },
  create(context) {
    const sourceRoot = sourceRootOf(context);
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    const folderSegments = folderSegmentsOf(file, sourceRoot);

    // Only a file whose immediate folder is a support folder is in scope —
    // this rule places support files, not arbitrary ones.
    const supportFolder = folderSegments[folderSegments.length - 1];
    if (!isSupportFolder(supportFolder)) return {};

    const expectedKind = KIND_FOR_SUPPORT_FOLDER[supportFolder];
    const doc = DOC_FOR_SUPPORT_FOLDER[supportFolder];
    const label = LABEL_FOR_SUPPORT_FOLDER[supportFolder];

    const isRoot = segments[0] === supportFolder;
    const isUnderFeature = segments[0] === "features";
    // Already exactly where a zero-consumer export belongs — nothing to check.
    if (isUnderFeature) return {};

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

      const where = isRoot ? `root src/${supportFolder}/` : `src/${folderSegments.join("/")}/`;
      findings.push({
        line: exp.line,
        message:
          `${label} "${exp.name}" has no consumer outside src/app/ or a configuration module, so it has not ` +
          `earned ${where}; move it into the feature it represents (src/features/*/${supportFolder}/). If no ` +
          `existing feature applies, introduce a new feature folder. See ${doc}`,
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
