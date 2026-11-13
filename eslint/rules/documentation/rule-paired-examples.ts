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
          // Markdown treats two-space-indented text immediately after a bullet
          // as part of that bullet, not as a following paragraph. Reject a
          // separate sentence there once the requirement sentence has ended,
          // while allowing a long requirement to wrap mid-sentence.
          if (requirements?.type === "list") {
            const lastItem = requirements.children.at(-1);
            const firstParagraph = lastItem?.children[0];
            if (firstParagraph?.type === "paragraph") {
              const startLine = getLine(firstParagraph);
              const endLine = firstParagraph.position?.end.line ?? startLine;
              const lines = context.sourceCode.lines;
              for (let line = startLine + 1; line <= endLine; line++) {
                const previous = lines[line - 2]?.trimEnd() ?? "";
                const continued = lines[line - 1] ?? "";
                if (/[.!?][`*_]*$/u.test(previous) && /^[ \t]{2,}\S/u.test(continued)) {
                  context.report({
                    node: firstParagraph,
                    message: "Rule requirements must be followed directly by the first Incorrect/Correct example",
                  });
                  break;
                }
              }
            }
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
        } else {
          const misplaced = exampleHeadings.find(
            (heading, index) => !heading.text.startsWith(index % 2 === 0 ? "Incorrect" : "Correct"),
          );
          if (misplaced) {
            context.report({
              node,
              message: `Rule examples must alternate Incorrect then Correct; found "${misplaced.text}" at line ${String(misplaced.line)}.`,
            });
          }
        }
      },
    };
  },
};
