/**
 * ESLint rule: pasika/lint-setup
 *
 * A repository MUST declare a lint script that runs ESLint across the
 * repository, and a format script that runs prettier --check across the
 * repository. It MUST also declare lint:staged and format:staged scripts
 * that run ESLint and prettier with no repository-wide argument, and
 * configure lint-staged to run them (npm run lint:staged --, npm run
 * format:staged --) for staged files — lint:staged for JavaScript or
 * TypeScript, format:staged for the files ESLint does not already format
 * (via the prettier plugin zirka bundles). The *:staged scripts must carry
 * no repository-wide argument of their own, or the file paths lint-staged
 * appends land after it and every commit re-checks the whole repository.
 *
 * @see docs/pasika-adoption-guide/rules/lint-setup-rule.md
 */

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

const SOURCE_GLOB_PATTERN = /(?:^|[^a-z])(?:[cm]?[jt]sx?)(?:[^a-z]|$)/i;
const DIRECT_ESLINT_PATTERN = /(?:^|&&|\|\||;)\s*(?:npx\s+)?eslint(?:\s|$)/;
const REPOSITORY_ARGUMENT_PATTERN = /(?:^|\s)\.(?=\s|$)/;
const PRETTIER_PATTERN = /\bprettier\b/;
const CHECK_FLAG_PATTERN = /(?:^|\s)(?:--check|-c)(?:\s|$)/;

function runsEslintDirectly(command: string): boolean {
  return DIRECT_ESLINT_PATTERN.test(command);
}

function runsPrettier(command: string): boolean {
  return PRETTIER_PATTERN.test(command);
}

function runsNamedScript(command: string, name: string): boolean {
  return command.includes(`npm run ${name}`);
}

export const lintSetupRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require full-repository lint/format scripts and argument-free staged-file scripts that lint-staged runs by name.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;

        const scripts = root.members.find((member) => memberName(member) === "scripts");
        const scriptMembers = scripts?.value.type === "Object" ? scripts.value.members : [];
        const findScript = (name: string): MemberNode | undefined =>
          scriptMembers.find((member) => memberName(member) === name);

        const lint = findScript("lint");
        const lintCommand = memberValue(lint);
        if (
          lintCommand === undefined ||
          !runsEslintDirectly(lintCommand) ||
          !REPOSITORY_ARGUMENT_PATTERN.test(lintCommand)
        ) {
          context.report({
            node: lint ?? node,
            message:
              'package.json must declare a "lint" script that runs ESLint across the repository (e.g. "eslint .").',
          });
        }

        const format = findScript("format");
        const formatCommand = memberValue(format);
        if (
          formatCommand === undefined ||
          !runsPrettier(formatCommand) ||
          !CHECK_FLAG_PATTERN.test(formatCommand) ||
          !REPOSITORY_ARGUMENT_PATTERN.test(formatCommand)
        ) {
          context.report({
            node: format ?? node,
            message: 'package.json must declare a "format" script that runs prettier --check across the repository.',
          });
        }

        const lintStaged = findScript("lint:staged");
        const lintStagedCommand = memberValue(lintStaged);
        if (
          lintStagedCommand === undefined ||
          !runsEslintDirectly(lintStagedCommand) ||
          REPOSITORY_ARGUMENT_PATTERN.test(lintStagedCommand)
        ) {
          context.report({
            node: lintStaged ?? node,
            message:
              'package.json must declare a "lint:staged" script that runs ESLint with no repository-wide argument (e.g. "eslint --fix").',
          });
        }

        const formatStaged = findScript("format:staged");
        const formatStagedCommand = memberValue(formatStaged);
        if (
          formatStagedCommand === undefined ||
          !runsPrettier(formatStagedCommand) ||
          REPOSITORY_ARGUMENT_PATTERN.test(formatStagedCommand)
        ) {
          context.report({
            node: formatStaged ?? node,
            message:
              'package.json must declare a "format:staged" script that runs prettier with no repository-wide argument (e.g. "prettier --write").',
          });
        }

        const lintStagedConfig = root.members.find((member) => memberName(member) === "lint-staged");
        const runsStagedScript = (name: string): boolean =>
          lintStagedConfig?.value.type === "Object" &&
          lintStagedConfig.value.members.some((member) =>
            stringValues(member.value).some((command) => runsNamedScript(command, name)),
          );

        const hasStagedLintEntry =
          lintStagedConfig?.value.type === "Object" &&
          lintStagedConfig.value.members.some(
            (member) =>
              SOURCE_GLOB_PATTERN.test(memberName(member)) &&
              stringValues(member.value).some((command) => runsNamedScript(command, "lint:staged")),
          );
        if (!hasStagedLintEntry) {
          context.report({
            node: lintStagedConfig ?? node,
            message:
              'package.json lint-staged must run "npm run lint:staged --" for staged JavaScript or TypeScript files.',
          });
        }

        if (!runsStagedScript("format:staged")) {
          context.report({
            node: lintStagedConfig ?? node,
            message:
              'package.json lint-staged must run "npm run format:staged --" for staged files ESLint does not already format.',
          });
        }
      },
    };
  },
};
