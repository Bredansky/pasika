import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";

const SUPPORT_FOLDERS = new Set(["constants", "types", "schemas"]);
const INDEX_NAMES = new Set(["index.ts", "index.tsx", "index.mts", "index.cts"]);

export const supportFolderShapeRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require support-folder exports to be defined in index.ts or named-re-exported by it.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const baseName = path.basename(filename);
    if (!INDEX_NAMES.has(baseName)) return {};

    const folder = path.basename(path.dirname(filename));
    if (!SUPPORT_FOLDERS.has(folder)) return {};

    const directory = path.dirname(filename);
    let entries: string[];
    try {
      entries = fs.readdirSync(directory);
    } catch {
      return {};
    }

    const siblingModules = entries.filter((entry) => entry !== baseName && /\.(?:[cm]?tsx?|jsx?)$/.test(entry));
    if (siblingModules.length === 0) return {};

    return {
      Program(node) {
        const source = context.sourceCode.text;
        const hasDirectExport = /export\s+(?:const|let|var|function|class|type|interface|enum)\b/.test(source);

        const namedExports = new Set<string>();
        const namedExportPattern = /export\s+\{[^}]*\}\s+from\s+["'](?<specifier>\.[^"']+)["']/g;
        for (const match of source.matchAll(namedExportPattern)) {
          const specifier = match.groups?.specifier;
          if (specifier) namedExports.add(path.basename(specifier));
        }

        const wildcardExports = new Set<string>();
        const wildcardExportPattern = /export\s+\*\s+from\s+["'](?<specifier>\.[^"']+)["']/g;
        for (const match of source.matchAll(wildcardExportPattern)) {
          const specifier = match.groups?.specifier;
          if (specifier) wildcardExports.add(path.basename(specifier));
        }

        // A file with direct exports and no re-export attempt at all chose the
        // "define directly" strategy; unreferenced siblings are its business.
        // But once it attempts to re-export siblings (named or wildcard), that
        // attempt must be complete and must use the named form.
        const hasAnyReExportAttempt = namedExports.size > 0 || wildcardExports.size > 0;
        if (hasDirectExport && !hasAnyReExportAttempt) return;

        const missing: string[] = [];
        const wildcardOffenders: string[] = [];
        for (const entry of siblingModules) {
          const stem = entry.replace(/\.(?:[cm]?tsx?|jsx?)$/, "");
          if (namedExports.has(stem)) continue;
          if (wildcardExports.has(stem)) {
            wildcardOffenders.push(entry);
            continue;
          }
          missing.push(entry);
        }
        if (missing.length === 0 && wildcardOffenders.length === 0) return;

        const guide = `docs/next-codebase-guide/rules/${folder === "constants" ? "constants" : "types-and-schemas"}-rule.md`;
        const messages: string[] = [];
        if (missing.length > 0) {
          messages.push(`must named-re-export every support file: ${missing.join(", ")}`);
        }
        if (wildcardOffenders.length > 0) {
          messages.push(
            `must use a named re-export (export { ... } from ...), not export *, for: ${wildcardOffenders.join(", ")}`,
          );
        }

        context.report({
          node,
          message: `${folder}/index.ts ${messages.join("; ")}. See ${guide}`,
        });
      },
    };
  },
};
