/**
 * ESLint rule: pasika/vitest-coverage
 *
 * A repository MUST declare vitest and @vitest/coverage-v8 in devDependencies,
 * expose normal and coverage-gated unit-test scripts, and set a coverage
 * threshold above zero for lines, functions, branches, and statements — a
 * zero threshold gates nothing.
 *
 * @see docs/pasika-adoption-guide/rules/vitest-coverage-rule.md
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode } from "@humanwhocodes/momoa";

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

function memberValue(member: MemberNode | undefined): string | undefined {
  return member?.value.type === "String" ? member.value.value : undefined;
}

/** Config file names Vitest resolves, in the order Vitest itself tries them. */
const VITEST_CONFIG_NAMES = [
  "vitest.config.ts",
  "vitest.config.mts",
  "vitest.config.cts",
  "vitest.config.js",
  "vitest.config.mjs",
  "vitest.config.cjs",
] as const;

/** Coverage metrics a threshold must cover. */
const THRESHOLD_METRICS = ["lines", "functions", "branches", "statements"] as const;
const COVERAGE_FLAG_PATTERN = /(?:^|\s)--coverage(?:[=\s]|$)/;

export const vitestCoverageRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require Vitest unit-test scripts, the V8 provider, and coverage thresholds above zero.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;

        const devDependencies = root.members.find((member) => memberName(member) === "devDependencies");
        const devDependencyNames = new Set(
          devDependencies?.value.type === "Object" ? devDependencies.value.members.map(memberName) : [],
        );
        if (!devDependencyNames.has("vitest")) {
          context.report({ node, message: "vitest must be listed in package.json as a devDependency." });
        }
        if (!devDependencyNames.has("@vitest/coverage-v8")) {
          context.report({
            node,
            message: "@vitest/coverage-v8 must be listed in package.json as a devDependency.",
          });
        }

        const scripts = root.members.find((member) => memberName(member) === "scripts");
        const scriptMembers = scripts?.value.type === "Object" ? scripts.value.members : [];
        const unit = scriptMembers.find((member) => memberName(member) === "test:unit");
        const unitCommand = memberValue(unit);
        if (unitCommand === undefined || !/\bvitest\b/.test(unitCommand) || COVERAGE_FLAG_PATTERN.test(unitCommand)) {
          context.report({
            node: unit ?? node,
            message: 'package.json must declare a "test:unit" script that runs Vitest without coverage.',
          });
        }
        const coverage = scriptMembers.find((member) => memberName(member) === "test:unit:coverage");
        const coverageCommand = memberValue(coverage);
        if (
          coverageCommand === undefined ||
          !/\bvitest\b/.test(coverageCommand) ||
          !COVERAGE_FLAG_PATTERN.test(coverageCommand)
        ) {
          context.report({
            node: coverage ?? node,
            message: 'package.json must declare a "test:unit:coverage" script that runs Vitest with coverage.',
          });
        }

        const configName = VITEST_CONFIG_NAMES.find((name) => existsSync(path.join(context.cwd, name)));
        if (!configName) {
          context.report({
            node,
            message:
              "No vitest config found. Create one with a coverage threshold above zero for lines, functions, branches, and statements.",
          });
          return;
        }
        const content = readFileSync(path.join(context.cwd, configName), "utf8");
        for (const metric of THRESHOLD_METRICS) {
          if (!new RegExp(`\\b${metric}\\s*:\\s*[1-9]\\d*`).test(content)) {
            context.report({ node, message: `${configName} must set a coverage threshold above zero for ${metric}.` });
          }
        }
      },
    };
  },
};
