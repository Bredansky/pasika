/**
 * ESLint rule: pasika/tech-stack
 *
 * A repository adopting the framework MUST list every package in the Tech Stack
 * Reference as a dependency or devDependency in package.json.
 *
 * @see docs/framework-adoption-guide/rules/tech-stack-rule.md
 */

import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

/** Required packages a repository must have as dependency or devDependency. */
const REQUIRED_PACKAGES = [
  "next",
  "react",
  "react-dom",
  "typescript",
  "tailwindcss",
  "zod",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
  "eslint",
  "prettier",
  "husky",
  "lint-staged",
  "zirka",
];

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

export const techStackRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require all Tech Stack Reference packages to be listed in package.json.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;

        const present = new Set<string>();
        for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
          const section = root.members.find((member) => memberName(member) === key);
          if (section?.value.type !== "Object") continue;
          for (const member of section.value.members) {
            present.add(memberName(member));
          }
        }

        for (const pkg of REQUIRED_PACKAGES) {
          if (present.has(pkg)) continue;
          context.report({
            node,
            message: `${pkg} must be listed in package.json as a dependency or devDependency.`,
          });
        }
      },
    };
  },
};