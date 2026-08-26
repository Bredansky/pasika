/**
 * ESLint rule: pasika/enforce-cva-variant-props
 *
 * Enforces the "Component Variant Rule" — VariantProps from CVA.
 *
 * @see docs/styling-guide/rules/component-variant-rule.md
 */

import type { Rule } from "eslint";
import type * as ESTree from "estree";
import type { TsTypeAliasDeclarationNode } from "../ast-types.js";

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
        const init = node.init;
        if (
          init?.type !== "CallExpression" ||
          init.callee.type !== "Identifier" ||
          init.callee.name !== "cva" ||
          node.id.type !== "Identifier"
        ) {
          return;
        }

        const args = init.arguments;
        if (args.length < 2) return;

        const options = args[1];
        if (options?.type !== "ObjectExpression") return;

        for (const prop of options.properties) {
          if (
            prop.type !== "Property" ||
            prop.key.type !== "Identifier" ||
            prop.key.name !== "variants" ||
            prop.value.type !== "ObjectExpression"
          ) {
            continue;
          }

          const variantNames = prop.value.properties
            .filter(
              (p): p is ESTree.Property & { key: ESTree.Identifier } =>
                p.type === "Property" && p.key.type === "Identifier",
            )
            .map((p) => p.key.name);
          if (variantNames.length > 0) {
            cvaDefinitions.set(node.id.name, variantNames);
          }
        }
      },

      TSTypeAliasDeclaration(node: TsTypeAliasDeclarationNode) {
        const aliasName = node.id?.name;
        if (!aliasName?.endsWith("Props")) return;
        if (node.typeAnnotation?.type !== "TSTypeLiteral") return;

        for (const member of node.typeAnnotation.members ?? []) {
          if (member.type !== "TSPropertySignature") continue;
          const keyName = member.key?.type === "Identifier" ? member.key.name : undefined;
          if (!keyName) continue;

          const typeAnn = member.typeAnnotation?.typeAnnotation;
          if (typeAnn?.type !== "TSUnionType") continue;

          // typescript-eslint emits ESTree `Literal` nodes; other TypeScript
          // parsers emit `StringLiteral`. Accept both so the rule works
          // whichever parser the consuming config installs.
          const allStringLiterals = (typeAnn.types ?? []).every(
            (t) =>
              t.type === "TSLiteralType" &&
              (t.literal?.type === "StringLiteral" ||
                (t.literal?.type === "Literal" && typeof t.literal.value === "string")),
          );

          if (allStringLiterals && (typeAnn.types?.length ?? 0) >= 2) {
            for (const variantNames of cvaDefinitions.values()) {
              if (variantNames.includes(keyName)) {
                context.report({
                  node,
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
      },
    };
  },
};
