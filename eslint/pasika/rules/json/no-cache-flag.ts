/**
 * ESLint rule: pasika/no-cache-flag
 *
 * A lint command MUST NOT pass ESLint's --cache flag, because rules that
 * compare a file against the rest of the tree need every file in the run.
 *
 * @see docs/agent-policy.md
 */

import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

export const noCacheFlagRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require lint scripts to not pass ESLint's --cache flag.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;
        const scripts = root.members.find((member) => memberName(member) === "scripts");
        if (scripts?.value.type !== "Object") return;
        for (const member of scripts.value.members) {
          const name = memberName(member);
          if (name !== "lint" && name !== "fix") continue;
          if (member.value.type !== "String") continue;
          if (member.value.value.includes("--cache")) {
            context.report({
              node: member,
              message:
                "Lint scripts must not pass ESLint's --cache flag because cross-file rules require every file in the run.",
            });
          }
        }
      },
    };
  },
};
