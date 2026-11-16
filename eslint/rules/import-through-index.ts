import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";
import ts from "typescript";
import { segmentsOf } from "../project/ccf";
import { resolveSpecifier } from "../project/index";
import { moduleDependencies, serverSupportModules } from "../project/server-support-modules";

const SUPPORT_FOLDERS = new Set(["constants", "types", "schemas"]);

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
    const serverModulesCache = new Map<string, Set<string>>();
    return {
      Program(node) {
        const source = ts.createSourceFile(filename, context.sourceCode.text, ts.ScriptTarget.Latest, true);
        for (const { specifier, runtime } of moduleDependencies(source)) {
          const target = resolveSpecifier(filename, specifier, sourceRoot);
          if (!target) continue;
          const targetSegments = segmentsOf(target, sourceRoot);
          const supportFolderIndex = targetSegments.findIndex((segment) => SUPPORT_FOLDERS.has(segment));
          if (supportFolderIndex < 0) continue;

          const supportFolder = targetSegments[supportFolderIndex];
          const folderIndex = targetSegments.slice(0, supportFolderIndex + 1);
          const candidateGroup = targetSegments[supportFolderIndex + 1];
          const groupDirectory = candidateGroup ? path.join(sourceRoot, ...folderIndex, candidateGroup) : undefined;
          const indexedGroup =
            groupDirectory !== undefined &&
            targetSegments.length > supportFolderIndex + 2 &&
            fs.existsSync(path.join(groupDirectory, "index.ts"));
          const entryFolder = indexedGroup && candidateGroup ? [...folderIndex, candidateGroup] : folderIndex;
          const supportDirectory = path.join(sourceRoot, ...entryFolder);

          let serverModules = serverModulesCache.get(supportDirectory);
          if (!serverModules) {
            serverModules = serverSupportModules(supportDirectory);
            serverModulesCache.set(supportDirectory, serverModules);
          }
          const serverTarget = serverModules.has(path.basename(target).replace(/\.[cm]?[jt]sx?$/u, ""));
          const serverEntry = path.basename(target) === "server.ts" && targetSegments.length === entryFolder.length + 1;
          const withinSameSupportFolder =
            importerSegments.length > entryFolder.length &&
            entryFolder.every((segment, index) => importerSegments[index] === segment);
          if (serverEntry) continue;
          if (serverTarget) {
            // Type-only references are erased and cannot introduce a server runtime dependency.
            if (!runtime || withinSameSupportFolder) continue;
            context.report({
              node,
              message: `Import server-only support modules through @/${entryFolder.join("/")}/server instead of "${specifier}". See the next-codebase-guide exports and imports rules.`,
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

function sourceRootOf(context: { cwd?: string }, filename: string): string {
  const marker = `${path.sep}src${path.sep}`;
  const srcIndex = filename.lastIndexOf(marker);
  if (srcIndex >= 0) return filename.slice(0, srcIndex + marker.length - 1);
  return path.resolve(context.cwd ?? process.cwd(), "src");
}
