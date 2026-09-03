/**
 * ESLint rule: pasika/lint-setup
 *
 * A repository MUST declare a lint script that runs ESLint across the
 * repository, and MUST configure lint-staged to run ESLint directly for
 * staged JavaScript or TypeScript files.
 *
 * @see docs/pasika-adoption-guide/rules/lint-setup-rule.md
 */

import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode, ValueNode } from "@humanwhocodes/momoa";

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

function stringValues(value: ValueNode): string[] {
  if (value.type === "String") return [value.value];
  if (value.type !== "Array") return [];
  return value.elements.flatMap((element) => (element.value.type === "String" ? [element.value.value] : []));
}

const SOURCE_GLOB_PATTERN = /(?:^|[^a-z])(?:[cm]?[jt]sx?)(?:[^a-z]|$)/i;
const DIRECT_ESLINT_PATTERN = /(?:^|&&|\|\||;)\s*(?:npx\s+)?eslint(?:\s|$)/;
const REPOSITORY_ARGUMENT_PATTERN = /(?:^|\s)\.(?=\s|$)/;

function runsEslintDirectly(command: string): boolean {
  return DIRECT_ESLINT_PATTERN.test(command);
}

export const lintSetupRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require full-repository linting and direct staged-file ESLint checks.",
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
      },
    };
  },
};
