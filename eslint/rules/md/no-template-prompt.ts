/**
 * @fileoverview No leftover bracketed template prompts.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Text } from "mdast";

const TEMPLATE_PROMPT = /^\s*\[[A-Z0-9].*\]\s*$/;

export const noTemplatePromptRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "No leftover bracketed template prompts.",
      recommended: true,
    },
  },
  create(context) {
    return {
      text(node: Text) {
        if (TEMPLATE_PROMPT.test(node.value)) {
          context.report({
            node,
            message: "leftover bracketed template prompt",
          });
        }
      },
    };
  },
};
