/**
 * ESLint rule: pasika/exact-version
 *
 * A dependency or devDependency in package.json MUST pin an exact version, never
 * a range. Ranges (`^`, `~`, `>=`, `*`, `latest`, `1.x`, ...) permit invisible
 * minor/patch bumps, so the declared version must be a bare `MAJOR.MINOR.PATCH`.
 * peerDependencies are excluded: a library declares a compatibility range for
 * its consumers' resolvers there, it does not install them itself.
 *
 * @see docs/pasika-adoption-guide/rules/dependency-version-rule.md
 */

import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

/** A bare semver like "1.2.3" is exact; any range operator or wildcard is not. */
const EXACT_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function memberValue(member: MemberNode): string | null {
  return member.value.type === "String" ? member.value.value : null;
}

export const exactVersionRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require dependency and devDependency versions to be pinned exactly.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;

        for (const key of ["dependencies", "devDependencies"]) {
          const section = root.members.find((member) => memberName(member) === key);
          if (section?.value.type !== "Object") continue;

          for (const member of section.value.members) {
            const version = memberValue(member);
            if (version === null) continue;
            if (!EXACT_VERSION_PATTERN.test(version)) {
              context.report({
                node: member,
                message: `${memberName(member)} must pin an exact version (e.g. "1.2.3"), not a range or cap such as "${version}".`,
              });
            }
          }
        }
      },
    };
  },
};
