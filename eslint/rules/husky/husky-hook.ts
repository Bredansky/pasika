/**
 * ESLint rule: pasika/husky-hook
 *
 * Enforces named pre-commit checks, Vulyk-owned staging, and explicit
 * review of Vitest coverage configuration changes.
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
        "Require a pre-commit hook that runs lint-staged, typecheck, coverage, suppression pruning, and the libyear drift check.",
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
        const commands = content.replace(/^[ \t]*#[^\r\n]*$/gm, "");

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
        if (scriptNames.has("test:requirements")) requireNamedScript("test:requirements");
        requireNamedScript("test:unit:coverage");

        const autoStageAll = /^\s*git\s+add\s+(?:--\s+)?(?:-A|--all|-u|\.)(?:\s*(?:#.*)?)?$/m.test(commands);
        const coverageIndex = commands.indexOf("npm run test:unit:coverage");
        const coverageGuards =
          /if\s+!\s+git\s+diff\s+--quiet\s+--\s+vitest\.config\.ts\s*;\s*then[\s\S]*?\bexit\s+1\b[\s\S]*?\bfi\b|git\s+diff\s+--exit-code\s+--\s+vitest\.config\.ts\s*\|\|\s*exit\s+1\b/g;
        const hasCoverageGuard = [...commands.matchAll(coverageGuards)].some((match) => match.index > coverageIndex);
        if (coverageIndex >= 0 && !hasCoverageGuard) {
          context.report({
            node,
            message: ".husky/pre-commit must reject unstaged vitest.config.ts changes after coverage.",
          });
        }
        if (autoStageAll || /\bgit\s+add\s+(?:--\s+)?vitest\.config\.ts\b/.test(commands)) {
          context.report({ node, message: ".husky/pre-commit must not auto-stage vitest.config.ts." });
        }

        if (existsSync(path.join(context.cwd, "vulyk.config.ts"))) {
          const syncIndex = commands.search(/\bnpx\s+vulyk\s+sync\b/);
          const agentsIndex = commands.search(/\bnpx\s+vulyk\s+agents\b/);
          const stagedIndex = commands.indexOf("lint-staged");
          if (syncIndex < 0 || agentsIndex <= syncIndex || stagedIndex <= agentsIndex) {
            context.report({
              node,
              message: ".husky/pre-commit must run npx vulyk sync and npx vulyk agents before lint-staged.",
            });
          }

          const stageIndex = commands.search(/\bnpx\s+vulyk\s+stage\b/);
          if (stageIndex <= agentsIndex || stageIndex >= stagedIndex) {
            context.report({
              node,
              message: ".husky/pre-commit must run npx vulyk stage after agents and before lint-staged.",
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
