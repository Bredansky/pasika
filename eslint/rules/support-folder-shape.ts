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
        "Require a support folder to either define its exports directly in index.ts or re-export its local sibling modules, never proxy an external module from an otherwise empty support folder or mix both.",
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

    return {
      Program(node) {
        const source = context.sourceCode.text;
        const hasDirectExport =
          /export\s+(?:const|let|var|function|class|interface|enum)\b/.test(source) ||
          /export\s+type\s+[A-Za-z_$][\w$]*(?:\s*<[^;=]*>)?\s*=/.test(source);

        const exportedFiles = new Set<string>();
        let hasAnyReExport = false;
        const exportPattern = /export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s+from\s+["'](?<specifier>[^"']+)["']/g;
        for (const match of source.matchAll(exportPattern)) {
          hasAnyReExport = true;
          const specifier = match.groups?.specifier;
          if (specifier?.startsWith(".")) exportedFiles.add(path.basename(specifier));
        }

        const guide = `docs/next-codebase-guide/rules/${folder === "constants" ? "constants" : "types-and-schemas"}-rule.md`;

        // Pick one strategy for the whole folder: define directly, or group
        // into re-exported sibling files. A support index without siblings
        // cannot act as a proxy for another support folder.
        if (siblingModules.length === 0) {
          if (hasDirectExport || !hasAnyReExport) return;

          context.report({
            node,
            message: `${folder}/index.ts re-exports from an external module without local support files; define the exports directly in index.ts. See ${guide}`,
          });
          return;
        }

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

        if (siblingModules.length === 1 && hasAnyReExport) {
          context.report({
            node,
            message: `${folder}/index.ts re-exports exactly one sibling module; define that module's exports directly in index.ts instead. See ${guide}`,
          });
          return;
        }

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
