/**
 * ESLint rule: pasika/zirka-installed
 *
 * zirka MUST be listed in package.json as a devDependency.
 *
 * @see docs/repository-policy.md
 */

import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

export const zirkaInstalledRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require zirka to be listed in package.json as a devDependency.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;

        const allDeps: string[] = [];
        for (const key of ["dependencies", "devDependencies"]) {
          const section = root.members.find((member) => memberName(member) === key);
          if (section?.value.type !== "Object") continue;
          for (const member of section.value.members) {
            allDeps.push(memberName(member));
          }
        }

        if (!allDeps.includes("zirka")) {
          context.report({
            node,
            message: "zirka must be listed in package.json as a devDependency.",
          });
        }
      },
    };
  },
};
