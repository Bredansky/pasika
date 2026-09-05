/**
 * ESLint rule: pasika/vulyk-dependency
 *
 * A repository adopting the framework MUST list vulyk in devDependencies
 * rather than dependencies so its typed config and CLI resolve the same pinned
 * package.
 *
 * @see docs/repository-policy.md
 * @see docs/pasika-adoption-guide/rules/vulyk-docs-rule.md
 */

import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

function dependency(root: DocumentNode["body"], sectionName: string): MemberNode | undefined {
  if (root.type !== "Object") return undefined;
  const section = root.members.find((member) => memberName(member) === sectionName);
  if (section?.value.type !== "Object") return undefined;
  return section.value.members.find((member) => memberName(member) === "vulyk");
}

export const vulykDependencyRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require vulyk in devDependencies so its typed config and CLI use the pinned package.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const runtimeDependency = dependency(node.body, "dependencies");
        const developmentDependency = dependency(node.body, "devDependencies");

        if (runtimeDependency) {
          context.report({
            node: runtimeDependency,
            message: "vulyk must be listed in devDependencies, not dependencies.",
          });
        }

        if (!developmentDependency && !runtimeDependency) {
          context.report({
            node,
            message: "vulyk must be listed in package.json as a devDependency.",
          });
        }
      },
    };
  },
};
