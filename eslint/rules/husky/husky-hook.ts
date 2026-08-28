/**
 * ESLint rule: pasika/husky-hook
 *
 * A repository MUST configure .husky/pre-commit to run lint-staged and
 * npm run typecheck, with a "prepare": "husky" script in package.json.
 *
 * @see docs/framework-adoption-guide/rules/husky-hook-rule.md
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

export const huskyHookRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a pre-commit hook that runs lint-staged and typecheck.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;
        const scriptName = context.filename;
        if (!scriptName.endsWith("package.json")) return;

        // pre-commit hook must exist and run lint-staged + typecheck
        const hookPath = path.join(process.cwd(), ".husky", "pre-commit");
        if (!existsSync(hookPath)) {
          context.report({
            node,
            message: "No .husky/pre-commit hook found. Configure husky to run checks before commits.",
          });
          return;
        }
        const content = readFileSync(hookPath, "utf8");
        if (!content.includes("lint-staged")) {
          context.report({ node, message: ".husky/pre-commit must run lint-staged." });
        }
        if (!content.includes("typecheck")) {
          context.report({ node, message: ".husky/pre-commit must run npm run typecheck." });
        }

        // prepare must run husky
        const scripts = root.members.find((member) => memberName(member) === "scripts");
        if (scripts?.value.type === "Object") {
          const prepare = scripts.value.members.find((member) => memberName(member) === "prepare");
          if (prepare?.value.type === "String" && !prepare.value.value.includes("husky")) {
            context.report({
              node: prepare,
              message: 'package.json "prepare" script must run husky (e.g. "prepare": "husky").',
            });
          }
        }
      },
    };
  },
};