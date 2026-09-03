/**
 * ESLint rule: pasika/vitest-coverage
 *
 * A repository MUST declare vitest and @vitest/coverage-v8 in devDependencies,
 * expose normal and coverage-gated unit-test scripts, and set a coverage
 * threshold above zero for lines, functions, branches, and statements with
 * autoUpdate enabled — a zero threshold gates nothing, and a fixed one lets a
 * later regression back down still pass. A test:unit:coverage:staged script
 * running `vitest related` must be wired into lint-staged for staged
 * JavaScript or TypeScript files, and coverage.changed + perFile thresholds
 * gate those files at 80% individually, so a new or modified file can't land
 * undertested behind a passing whole-repository aggregate — the aggregate
 * itself stays a CI-only concern.
 *
 * @see docs/pasika-adoption-guide/rules/vitest-coverage-rule.md
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode, ValueNode } from "@humanwhocodes/momoa";

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

function memberValue(member: MemberNode | undefined): string | undefined {
  return member?.value.type === "String" ? member.value.value : undefined;
}

function stringValues(value: ValueNode): string[] {
  if (value.type === "String") return [value.value];
  if (value.type !== "Array") return [];
  return value.elements.flatMap((element) => (element.value.type === "String" ? [element.value.value] : []));
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
const SOURCE_GLOB_PATTERN = /(?:^|[^a-z])(?:[cm]?[jt]sx?)(?:[^a-z]|$)/i;
const COVERAGE_FLAG_PATTERN = /(?:^|\s)--coverage(?:[=\s]|$)/;
const RELATED_PATTERN = /\brelated\b/;
const AUTO_UPDATE_PATTERN = /autoUpdate\s*:\s*true/;
const CHANGED_PATTERN = /changed\s*:/;
const EIGHTY_OR_ABOVE_PATTERN = /(?:lines|functions|branches|statements)\s*:\s*(?:8\d|9\d|100)\b/;

export const vitestCoverageRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require Vitest unit-test scripts, the V8 provider, a rising coverage threshold, and an 80% floor on staged files via lint-staged.",
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

        if (!AUTO_UPDATE_PATTERN.test(content)) {
          context.report({
            node,
            message: `${configName} must set coverage.thresholds.autoUpdate to true.`,
          });
        }

        const changedCoverage = scriptMembers.find((member) => memberName(member) === "test:unit:coverage:staged");
        const changedCoverageCommand = memberValue(changedCoverage);
        if (
          changedCoverageCommand === undefined ||
          !/\bvitest\b/.test(changedCoverageCommand) ||
          !RELATED_PATTERN.test(changedCoverageCommand) ||
          !COVERAGE_FLAG_PATTERN.test(changedCoverageCommand)
        ) {
          context.report({
            node: changedCoverage ?? node,
            message:
              'package.json must declare a "test:unit:coverage:staged" script that runs vitest related with coverage.',
          });
        }

        const lintStaged = root.members.find((member) => memberName(member) === "lint-staged");
        const hasStagedChangedCoverage =
          lintStaged?.value.type === "Object" &&
          lintStaged.value.members.some(
            (member) =>
              SOURCE_GLOB_PATTERN.test(memberName(member)) &&
              stringValues(member.value).some((command) => command.includes("npm run test:unit:coverage:staged")),
          );
        if (!hasStagedChangedCoverage) {
          context.report({
            node: lintStaged ?? node,
            message:
              'package.json lint-staged must run "npm run test:unit:coverage:staged" for staged JavaScript or TypeScript files.',
          });
        }

        if (!CHANGED_PATTERN.test(content) || !content.includes("perFile") || !EIGHTY_OR_ABOVE_PATTERN.test(content)) {
          context.report({
            node,
            message: `${configName} must configure coverage.changed and a coverage.thresholds.perFile of at least 80 for lines, functions, branches, and statements.`,
          });
        }
      },
    };
  },
};
