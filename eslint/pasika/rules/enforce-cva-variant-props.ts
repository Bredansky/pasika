/**
 * ESLint rule: pasika/enforce-cva-variant-props
 *
 * Enforces the "Component Variant Rule" — VariantProps from CVA.
 *
 * @see docs/styling-guide/rules/component-variant-rule.md
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- ESLint rule files work with ESTree AST nodes inherently */

import type { Rule } from "eslint";

export const enforceCvaVariantPropsRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Enforce VariantProps from CVA instead of manual variant union types.",
    },
  },
  create(context) {
    const cvaDefinitions = new Map<string, string[]>();

    return {
      VariableDeclarator(node) {
        if (
          node.init?.type === "CallExpression" &&
          node.init.callee.type === "Identifier" &&
          node.init.callee.name === "cva" &&
          node.id.type === "Identifier"
        ) {
          const args = node.init.arguments;
          if (args.length < 2) return;

          const options = args[1];
          if (options?.type === "ObjectExpression") {
            for (const prop of options.properties) {
              if (
                prop.type === "Property" &&
                prop.key.type === "Identifier" &&
                prop.key.name === "variants" &&
                prop.value.type === "ObjectExpression"
              ) {
                const variantNames = prop.value.properties
                  .filter((p) => p.type === "Property" && p.key.type === "Identifier")
                  .map((p) => (p as { key: { name: string } }).key.name);
                if (variantNames.length > 0) {
                  cvaDefinitions.set(node.id.name, variantNames);
                }
              }
            }
          }
        }
      },

      TSTypeAliasDeclaration(node: any) {
        if (!node.id.name.endsWith("Props")) return;
        if (node.typeAnnotation.type !== "TSTypeLiteral") return;

        for (const member of node.typeAnnotation.members) {
          if (
            member.type === "TSPropertySignature" &&
            member.key.type === "Identifier" &&
            member.typeAnnotation?.typeAnnotation?.type === "TSUnionType"
          ) {
            const keyName = String(member.key.name);
            const typeAnn = member.typeAnnotation.typeAnnotation;

            const allStringLiterals = typeAnn.types.every(
              (t: any) => t.type === "TSLiteralType" && t.literal.type === "StringLiteral",
            );

            if (allStringLiterals && typeAnn.types.length >= 2) {
              for (const [, variantNames] of cvaDefinitions) {
                if (variantNames.includes(keyName)) {
                  context.report({
                    node: member as never,
                    message:
                      `Variant prop "${keyName}" duplicates CVA variant values. ` +
                      "Use VariantProps<typeof variants> instead of manually writing union types. " +
                      "See docs/styling-guide/rules/component-variant-rule.md",
                  });
                  return;
                }
              }
            }
          }
        }
      },
    };
  },
};

/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- re-enable after AST node access block */
