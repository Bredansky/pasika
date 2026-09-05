/**
 * ESLint rule: pasika/husky-hook
 *
 * A repository MUST configure .husky/pre-commit to run lint-staged and
 * npx libyear --limit-major-individual=1 directly, with a "prepare": "husky"
 * script in package.json. Its typecheck, coverage suite, and — once the
 * repository tracks eslint-suppressions.json — its suppression-file ratchet,
 * run through named package.json scripts that the hook calls by name. The hook
 * stages files changed by either ratchet after the command that updates them.
 * What each named script does internally is the repository's choice; this
 * rule only checks that the name exists in both places.
 *
 * @see docs/pasika-adoption-guide/rules/husky-hook-rule.md
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

const VITEST_CONFIG_NAMES = [
  "vitest.config.ts",
  "vitest.config.mts",
  "vitest.config.cts",
  "vitest.config.js",
  "vitest.config.mjs",
  "vitest.config.cjs",
];

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

export const huskyHookRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require a pre-commit hook that runs lint-staged, typecheck, coverage and suppression pruning with local staging, and the libyear drift check.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;
        if (!context.filename.endsWith("package.json")) return;

        const hookPath = path.join(context.cwd, ".husky", "pre-commit");
        if (!existsSync(hookPath)) {
          context.report({
            node,
            message: "No .husky/pre-commit hook found. Configure husky to run checks before commits.",
          });
          return;
        }
        const content = readFileSync(hookPath, "utf8");

        const scripts = root.members.find((member) => memberName(member) === "scripts");
        const scriptNames = new Set(scripts?.value.type === "Object" ? scripts.value.members.map(memberName) : []);

        /** A named script must be declared in package.json and run by name (`npm run <name>`) in the hook. */
        const requireNamedScript = (name: string): void => {
          if (!scriptNames.has(name)) {
            context.report({ node, message: `package.json must declare a "${name}" script.` });
          }
          if (!content.includes(`npm run ${name}`)) {
            context.report({ node, message: `.husky/pre-commit must run npm run ${name}.` });
          }
        };

        if (!content.includes("lint-staged")) {
          context.report({ node, message: ".husky/pre-commit must run lint-staged." });
        }
        requireNamedScript("typecheck");
        requireNamedScript("test:unit:coverage");

        const vitestConfigName = VITEST_CONFIG_NAMES.find((name) => existsSync(path.join(context.cwd, name)));
        if (vitestConfigName !== undefined) {
          const coverageIndex = content.indexOf("npm run test:unit:coverage");
          const localAddIndex = content.indexOf(`git add ${vitestConfigName}`);

          if (localAddIndex <= coverageIndex) {
            context.report({
              node,
              message: `.husky/pre-commit must stage an auto-updated ${vitestConfigName} after coverage.`,
            });
          }
        }
        if (!content.includes("libyear --limit-major-individual=1")) {
          context.report({ node, message: ".husky/pre-commit must run npx libyear --limit-major-individual=1." });
        }

        // once the repo tracks a suppressions file, the hook must keep it canonical through a named script
        const suppressionsPath = path.join(context.cwd, "eslint-suppressions.json");
        if (existsSync(suppressionsPath)) {
          requireNamedScript("lint:prune");

          const pruneIndex = content.indexOf("npm run lint:prune");
          const localAddIndex = content.indexOf("git add eslint-suppressions.json");

          if (localAddIndex <= pruneIndex) {
            context.report({
              node,
              message: ".husky/pre-commit must stage eslint-suppressions.json after pruning suppressions.",
            });
          }
        }

        // prepare must run husky
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
