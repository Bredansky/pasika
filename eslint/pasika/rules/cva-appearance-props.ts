/**
 * ESLint rule: pasika/cva-appearance-props
 *
 * Enforces that components exposing visual option props (size, variant, etc.)
 * define them via a cva() call rather than raw union types.
 *
 * @see docs/styling-guide/rules/component-variant-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- ESLint rule files work with ESTree AST nodes inherently */

import type { Rule } from "eslint";

const VISUAL_OPTION_NAMES = new Set([
  "size",
  "variant",
  "tone",
  "color",
  "appearance",
  "intent",
  "style",
  "scheme",
  "theme",
]);

function hasCvaCall(body: readonly unknown[]): boolean {
  for (const stmt of body) {
    const node = stmt as { type?: string; declarations?: unknown[] };
    if (node.type !== "VariableDeclaration") continue;
    for (const decl of node.declarations ?? []) {
      const d = decl as {
        init?: { type?: string; callee?: { name?: string } };
      };
      if (d.init?.type === "CallExpression" && d.init.callee?.name === "cva") {
        return true;
      }
    }
  }
  return false;
}

export const cvaAppearancePropsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Components with visual option props must define them using cva.",
    },
  },
  create(context) {
    const program = context.sourceCode.ast;
    const hasCva = hasCvaCall(program.body);

    // If cva is used anywhere in the file, all visual option props are assumed
    // to be handled by that definition. This avoids false positives when the
    // cva call and the component are in different scopes.
    if (hasCva) return {};

    return {
      TSTypeAliasDeclaration(node: any) {
        if (node.id?.type !== "Identifier" || !node.id.name.endsWith("Props")) return;
        if (node.typeAnnotation?.type !== "TSTypeLiteral") return;

        for (const member of node.typeAnnotation.members) {
          if (member.type !== "TSPropertySignature") continue;
          const keyName: string | undefined = member.key?.type === "Identifier" ? member.key.name : undefined;
          if (!keyName || !VISUAL_OPTION_NAMES.has(keyName)) continue;

          // Only flag union types (string literal unions like "sm" | "lg")
          const typeAnnotation = member.typeAnnotation?.typeAnnotation ?? member.typeAnnotation;
          if (!typeAnnotation) continue;

          // Accept both TSUnionType and TSTypeLiteral
          if (typeAnnotation.type === "TSUnionType" || typeAnnotation.type === "TSTypeLiteral") {
            context.report({
              node: member,
              message:
                `Visual option prop "${keyName}" must be defined through a cva() call ` +
                "rather than a manual union type. See docs/styling-guide/rules/component-variant-rule.md",
            });
          }
        }
      },
    };
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- re-enable after AST node access block */
