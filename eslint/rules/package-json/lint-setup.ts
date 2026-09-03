/**
 * ESLint rule: pasika/lint-setup
 *
 * A repository MUST declare a lint script that runs ESLint across the
 * repository, and a format script that runs prettier --check across the
 * repository. It MUST configure lint-staged to run ESLint directly for
 * staged JavaScript or TypeScript files, and prettier for staged files —
 * ESLint already enforces prettier's formatting on JS/TS files it lints
 * (via the prettier plugin zirka bundles), so prettier only needs a direct
 * lint-staged entry for the files ESLint does not touch.
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

export const lintSetupRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require full-repository lint/format checks and direct staged-file ESLint and prettier checks.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        const root = node.body;
        if (root.type !== "Object") return;

        const scripts = root.members.find((member) => memberName(member) === "scripts");
        const lint =
          scripts?.value.type === "Object"
            ? scripts.value.members.find((member) => memberName(member) === "lint")
            : undefined;
        const lintCommand = lint?.value.type === "String" ? lint.value.value : undefined;
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

        const format =
          scripts?.value.type === "Object"
            ? scripts.value.members.find((member) => memberName(member) === "format")
            : undefined;
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

        const lintStaged = root.members.find((member) => memberName(member) === "lint-staged");
        const hasStagedEslint =
          lintStaged?.value.type === "Object" &&
          lintStaged.value.members.some(
            (member) =>
              SOURCE_GLOB_PATTERN.test(memberName(member)) &&
              stringValues(member.value).some((command) => runsEslintDirectly(command)),
          );
        if (!hasStagedEslint) {
          context.report({
            node: lintStaged ?? node,
            message: "package.json lint-staged must run ESLint directly for staged JavaScript or TypeScript files.",
          });
        }

        const hasStagedPrettier =
          lintStaged?.value.type === "Object" &&
          lintStaged.value.members.some((member) =>
            stringValues(member.value).some((command) => runsPrettier(command)),
          );
        if (!hasStagedPrettier) {
          context.report({
            node: lintStaged ?? node,
            message: "package.json lint-staged must run prettier for staged files ESLint does not already format.",
          });
        }
      },
    };
  },
};
