/**
 * @fileoverview Rule must have paired Incorrect/Correct examples.
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Root } from "mdast";
import { getFilename, getLine, getTextContent } from "./helpers";

export const rulePairedExamplesRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Rule must have paired Incorrect/Correct examples.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        const filename = getFilename(context);
        if (!filename.endsWith("-rule.md")) return;

        const exampleHeadings: { line: number; text: string }[] = [];

        for (const child of node.children) {
          if (child.type !== "heading" || child.depth !== 2) continue;

          const text = getTextContent(child).trim();
          if (/^(?:Incorrect|Correct)\b/.test(text)) {
            exampleHeadings.push({ line: getLine(child), text });
            continue;
          }

          context.report({
            node: child,
            message: `Rule level-2 heading must be an Incorrect/Correct example: ${text}`,
          });
        }

        // Rule template: title, overview, requirements list, then example
        // sections. A loose paragraph after the bullets violates that shape,
        // even when it avoids RFC vocabulary and all example headings are valid.
        const firstExampleIndex = node.children.findIndex((child) => child.type === "heading" && child.depth === 2);
        const requirementsIndex = node.children.findIndex(
          (child, index) => index < firstExampleIndex && child.type === "list" && !child.ordered,
        );
        if (requirementsIndex !== -1) {
          const requirements = node.children[requirementsIndex];
          if (requirements?.type === "list" && requirements.spread) {
            context.report({
              node: requirements,
              message: "Rule requirement bullets must form one uninterrupted list without blank lines",
            });
          }
          for (const child of node.children.slice(requirementsIndex + 1, firstExampleIndex)) {
            context.report({
              node: child,
              message: "Rule requirements must be followed directly by the first Incorrect/Correct example",
            });
          }
        }

        // Once the explanation starts, an example cannot append unattached
        // prose, code, or another block before the next example heading.
        let inExample = false;
        let afterWhy = false;
        for (const child of node.children) {
          if (child.type === "heading" && child.depth === 2) {
            inExample = true;
            afterWhy = false;
            continue;
          }
          if (!inExample) continue;
          if (afterWhy) {
            context.report({
              node: child,
              message: "A Why explanation must be the final block of its example",
            });
          } else if (child.type === "paragraph" && getTextContent(child).trim().startsWith("Why:")) {
            afterWhy = true;
          }
        }

        const incorrect = exampleHeadings.filter((h) => h.text.startsWith("Incorrect"));
        const correct = exampleHeadings.filter((h) => h.text.startsWith("Correct"));

        if (incorrect.length === 0 || incorrect.length !== correct.length) {
          context.report({
            node,
            message: `${String(incorrect.length)} Incorrect and ${String(correct.length)} Correct examples`,
          });
        }
      },
    };
  },
};
