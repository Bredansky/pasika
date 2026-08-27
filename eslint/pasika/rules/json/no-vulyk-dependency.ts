/**
 * ESLint rule: pasika/no-vulyk-dependency
 *
 * Vulyk MUST NOT be added to package.json in order to run its CLI; it MUST run
 * as an ephemeral command such as npx vulyk@latest.
 *
 * @see docs/agent-policy.md
 */

import type { Rule } from "eslint";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

export const noVulykDependencyRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require vulyk to run as an ephemeral command, not a package.json dependency.",
    },
  },
  create(context: Rule.RuleContext) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;
        for (const key of ["dependencies", "devDependencies"]) {
          const section = root.members.find((member) => memberName(member) === key);
          if (section?.value.type !== "Object") continue;
          const vulyk = section.value.members.find((member) => memberName(member) === "vulyk");
          if (vulyk) {
            context.report({
              node: vulyk,
              message: 'Vulyk must not be a package.json dependency. Run it as "npx vulyk@latest" instead.',
            });
          }
        }
      },
    };
  },
};
