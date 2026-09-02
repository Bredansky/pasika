/**
 * ESLint rule: pasika/husky-hook
 *
 * A repository MUST configure .husky/pre-commit to run lint-staged,
 * npm run typecheck, and npx libyear --limit-major-individual=1, with a
 * "prepare": "husky" script in package.json. A repository that tracks
 * eslint-suppressions.json must also prune it between the typecheck and the
 * drift check, staging the shrink locally and failing on any diff in CI.
 *
 * @see docs/pasika-adoption-guide/rules/husky-hook-rule.md
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
      description:
        "Require a pre-commit hook that runs lint-staged, typecheck, the suppression-file ratchet, and the libyear drift check.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;
        const scriptName = context.filename;
        if (!scriptName.endsWith("package.json")) return;

        // pre-commit hook must exist and run lint-staged + typecheck + libyear drift check
        const hookPath = path.join(context.cwd, ".husky", "pre-commit");
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
        if (!content.includes("libyear --limit-major-individual=1")) {
          context.report({ node, message: ".husky/pre-commit must run npx libyear --limit-major-individual=1." });
        }

        // once the repo tracks a suppressions file, the hook must prune it and ratchet it in CI
        const suppressionsPath = path.join(context.cwd, "eslint-suppressions.json");
        if (existsSync(suppressionsPath)) {
          if (!content.includes("--prune-suppressions")) {
            context.report({
              node,
              message: ".husky/pre-commit must prune eslint-suppressions.json (eslint . --prune-suppressions).",
            });
          }
          if (!content.includes("git diff --exit-code eslint-suppressions.json")) {
            context.report({
              node,
              message: ".husky/pre-commit must fail on any eslint-suppressions.json diff in CI ($CI = true).",
            });
          }
          if (!content.includes("git add eslint-suppressions.json")) {
            context.report({
              node,
              message: ".husky/pre-commit must stage the eslint-suppressions.json shrink locally.",
            });
          }
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
