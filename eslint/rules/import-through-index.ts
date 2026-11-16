import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import { segmentsOf } from "../project/ccf";
import { resolveSpecifier } from "../project/index";

export const importThroughIndexRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce public support barrels and direct sibling constants imports.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context, filename);
    const importerSegments = segmentsOf(filename, sourceRoot);
    return {
      Program(node) {
        for (const specifier of importSpecifiers(context.sourceCode.text)) {
          const target = resolveSpecifier(filename, specifier, sourceRoot);
          if (!target) continue;
          const targetSegments = segmentsOf(target, sourceRoot);
          const supportFolderIndex = targetSegments.findIndex((segment) =>
            ["constants", "types", "schemas"].includes(segment),
          );
          const supportFolder = supportFolderIndex >= 0 ? targetSegments[supportFolderIndex] : undefined;
          if (!supportFolder) continue;

          // Server-only modules use the optional server.ts entry; shared modules use index.ts.
          // Subfolders with their own index.ts are independent public entry points.
          const folderIndex = targetSegments.slice(0, supportFolderIndex + 1);
          const serverTarget = /\.server\.[cm]?[jt]sx?$/.test(path.basename(target));
          const serverEntry = path.basename(target) === "server.ts";
          const candidateGroup = targetSegments[supportFolderIndex + 1];
          const groupDirectory = candidateGroup ? path.join(sourceRoot, ...folderIndex, candidateGroup) : undefined;
          const indexedGroup =
            groupDirectory !== undefined &&
            targetSegments.length > supportFolderIndex + 2 &&
            path.basename(target) !== "index.ts" &&
            path.basename(target) !== "server.ts" &&
            fs.existsSync(path.join(groupDirectory, "index.ts"));
          const entryFolder = indexedGroup ? [...folderIndex, candidateGroup] : folderIndex;
          const withinSameSupportFolder =
            importerSegments.length > entryFolder.length &&
            entryFolder.every((segment, index) => importerSegments[index] === segment);
          if (serverEntry) continue;
          if (serverTarget) {
            if (withinSameSupportFolder) continue;
            context.report({
              node,
              message: `Import server-only support modules through @/${folderIndex.join("/")}/server instead of "${specifier}". See the next-codebase-guide exports and imports rules.`,
            });
            continue;
          }
          if (path.basename(target).startsWith("index.")) {
            if (supportFolder === "constants" && withinSameSupportFolder) {
              context.report({
                node,
                message:
                  `Import sibling constants directly instead of through "${specifier}" to avoid circular barrel imports. ` +
                  "See the next-codebase-guide constants rule.",
              });
            }
            continue;
          }
          if (withinSameSupportFolder) continue;
          const expected = `@/${entryFolder.join("/")}`;
          context.report({
            node,
            message:
              `Import support files through ${expected} instead of "${specifier}". ` +
              "See the next-codebase-guide exports and imports rules.",
          });
        }
      },
    };
  },
};

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const pattern = /\bimport\s+(?:(?:type\s+)?[\s\S]*?\sfrom\s+)?["'](?<specifier>[^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const specifier = match.groups?.specifier;
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
}

function sourceRootOf(context: { cwd?: string }, filename: string): string {
  const marker = `${path.sep}src${path.sep}`;
  const srcIndex = filename.lastIndexOf(marker);
  // Prefer the src root implied by the linted file's own path, which is immune
  // to cwd entirely; fall back to ESLint's cwd rather than the process cwd.
  if (srcIndex >= 0) return filename.slice(0, srcIndex + marker.length - 1);
  return path.resolve(context.cwd ?? process.cwd(), "src");
}
