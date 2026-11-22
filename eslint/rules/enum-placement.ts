/**
 * ESLint rule: pasika/enum-placement
 *
 * An enum stays in its component file while every external consumer also
 * imports that component. Independently imported enums belong in constants/;
 * one-member enums require a verified multi-valued platform property.
 *
 * @see docs/next-codebase-guide/rules/constants-rule.md
 */
import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex, isTestConsumer, symbolKey } from "../project/index";
import { typedParserServices } from "./contract-ownership";
import { isPlatformPropertyEnum } from "./prefer-enum";
import { sourceRootOf } from "./project-root";

function literalEnumMember(node: unknown): { name: string; value: string | number } | undefined {
  if (!node || typeof node !== "object" || !("id" in node) || !("initializer" in node)) return undefined;
  const { id, initializer } = node;
  if (!id || typeof id !== "object" || !("name" in id) || typeof id.name !== "string") return undefined;
  if (!initializer || typeof initializer !== "object" || !("value" in initializer)) return undefined;
  const value = initializer.value;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  return { name: id.name, value };
}

export const enumPlacementRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Keep file-local enums local, place shared enums in constants/, and permit one-member enums only for proven platform property domains.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const sourceRoot = sourceRootOf(context);
    if (!filename.startsWith(sourceRoot + path.sep)) return {};
    const inConstantsFolder = path.basename(path.dirname(filename)) === "constants";
    const index = getProjectIndex(sourceRoot);
    const component = index?.modules.get(filename)?.exports.find((entry) => entry.kind === "component");
    const componentConsumers = component ? index?.symbolConsumers.get(symbolKey(filename, component.name)) : undefined;
    const program = typedParserServices(context.sourceCode.parserServices)?.program;

    return {
      TSEnumDeclaration(node: Rule.Node) {
        const enumBody = "body" in node ? node.body : undefined;
        const members =
          enumBody && typeof enumBody === "object" && "members" in enumBody ? enumBody.members : undefined;
        const enumId = "id" in node ? node.id : undefined;
        const enumName = enumId && typeof enumId === "object" && "name" in enumId ? enumId.name : undefined;
        if (!Array.isArray(members) || typeof enumName !== "string") return;
        if (members.length === 1) {
          const member = literalEnumMember(members[0]);
          const validPlatformEnum = member && isPlatformPropertyEnum(enumName, [member], program);
          if (!validPlatformEnum) {
            context.report({
              node,
              message:
                "A single named string or number value must be a const, not a one-member enum, unless it represents a property with multiple supported values. See docs/next-codebase-guide/rules/constants-rule.md",
            });
            return;
          }
        }
        const consumers = index?.symbolConsumers.get(symbolKey(filename, enumName));
        if (inConstantsFolder || !consumers || consumers.size === 0) return;
        const productionConsumers = [...consumers].filter((consumer) => !isTestConsumer(consumer));
        if (productionConsumers.length === 0) return;
        if (component && productionConsumers.every((consumer) => componentConsumers?.has(consumer))) return;
        context.report({
          node,
          message:
            "An enum imported independently of its component must live in constants/ at its CCF; keep component-owned enums beside their component. See docs/next-codebase-guide/rules/constants-rule.md",
        });
      },
    };
  },
};
