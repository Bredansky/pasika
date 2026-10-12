/**
 * ESLint rule: pasika/enum-placement
 *
 * An enum used only in its declaring file stays local. Enums actually imported
 * by other source files belong in constants/, and one-member enums are constants.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex, symbolKey } from "../project/index";
import { sourceRootOf } from "./project-root";

export const enumPlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Keep file-local enums local, place shared enums in constants/, and avoid one-member enums.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};
    const inConstantsFolder = path.basename(path.dirname(filename)) === "constants";
    const index = getProjectIndex(sourceRoot);

    return {
      TSEnumDeclaration(node: Rule.Node) {
        const enumBody = "body" in node ? node.body : undefined;
        const members =
          enumBody && typeof enumBody === "object" && "members" in enumBody ? enumBody.members : undefined;
        const enumId = "id" in node ? node.id : undefined;
        const enumName = enumId && typeof enumId === "object" && "name" in enumId ? enumId.name : undefined;
        if (!Array.isArray(members) || typeof enumName !== "string") return;
        if (members.length === 1) {
          context.report({
            node,
            message:
              "A single named string or number value must be a const, not a one-member enum. See docs/next-codebase-guide/rules/constants-rule.md",
          });
          return;
        }
        const shared = (index?.symbolConsumers.get(symbolKey(filename, enumName))?.size ?? 0) > 0;
        if (inConstantsFolder || !shared) return;
        context.report({
          node,
          message:
            "An enum imported by another file must live in a constants/ folder at its CCF; keep file-local enums beside their consumers. See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
    };
  },
};
