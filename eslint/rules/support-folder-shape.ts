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
      description:
        "Require a support folder to either define its exports directly in index.ts or re-export every sibling from it, never both.",
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

        const exportedFiles = new Set<string>();
        const exportPattern = /export\s+(?:\{[^}]*\}|\*[^;]*)\s+from\s+["'](?<specifier>\.[^"']+)["']/g;
        for (const match of source.matchAll(exportPattern)) {
          const specifier = match.groups?.specifier;
          if (specifier) exportedFiles.add(path.basename(specifier));
        }
        const hasAnyReExport = exportedFiles.size > 0;

        const guide = `docs/next-codebase-guide/rules/${folder === "constants" ? "constants" : "types-and-schemas"}-rule.md`;

        // Pick one strategy for the whole folder: define directly, or group
        // into re-exported sibling files. Mixing both in the same index.ts is
        // the violation -- export * is just as valid a re-export as a named
        // one, so it's not distinguished here.
        if (hasDirectExport && hasAnyReExport) {
          context.report({
            node,
            message: `${folder}/index.ts mixes direct exports with re-exported support files; pick one strategy for the whole folder. See ${guide}`,
          });
          return;
        }
        if (hasDirectExport) return;

        const missing = siblingModules.filter((entry) => {
          const stem = entry.replace(/\.(?:[cm]?tsx?|jsx?)$/, "");
          return !exportedFiles.has(stem);
        });
        if (missing.length === 0) return;

        context.report({
          node,
          message: `${folder}/index.ts must re-export every support file: ${missing.join(", ")}. See ${guide}`,
        });
      },
    };
  },
};
