/**
 * ESLint rule: pasika/nextjs-stack
 *
 * A repository adopting the framework MUST list the runtime packages the rule
 * doc names in `dependencies` and the toolchain packages it names in
 * `devDependencies`.
 *
 * @see docs/framework-adoption-guide/rules/next-js-stack-rule.md
 */

import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

/** Packages a repository must list in `dependencies`. */
export const NEXTJS_STACK_DEPENDENCIES = [
  "next",
  "react",
  "react-dom",
  "zod",
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
] as const;

/** Packages a repository must list in `devDependencies`. */
export const NEXTJS_STACK_DEV_DEPENDENCIES = [
  "typescript",
  "tailwindcss",
  "eslint",
  "prettier",
  "husky",
  "lint-staged",
  "zirka",
] as const;

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

/** Package names declared in one manifest section, if the section is an object. */
function sectionPackages(root: DocumentNode["body"], section: string): Set<string> {
  const member = root.type === "Object" ? root.members.find((entry) => memberName(entry) === section) : undefined;
  if (member?.value.type !== "Object") return new Set();
  return new Set(member.value.members.map(memberName));
}

export const nextjsStackRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require the framework's runtime packages in dependencies and toolchain packages in devDependencies.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;

        const dependencies = sectionPackages(root, "dependencies");
        const devDependencies = sectionPackages(root, "devDependencies");

        for (const pkg of NEXTJS_STACK_DEPENDENCIES) {
          if (dependencies.has(pkg)) continue;
          context.report({
            node,
            message: `${pkg} must be listed in package.json as a dependency.`,
          });
        }
        for (const pkg of NEXTJS_STACK_DEV_DEPENDENCIES) {
          if (devDependencies.has(pkg)) continue;
          context.report({
            node,
            message: `${pkg} must be listed in package.json as a devDependency.`,
          });
        }
      },
    };
  },
};
