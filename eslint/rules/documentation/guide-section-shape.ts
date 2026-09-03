/**
 * @fileoverview Guide sections use How To headings and contain structured numbered steps.
 * @see docs/documentation-guide/rules/guide-creation-rule.md
 */
import type { MarkdownRuleDefinition } from "@eslint/markdown";
import type { Heading, Root } from "mdast";
import { getFilename, getTextContent } from "./helpers";

interface GuideSection {
  heading: Heading;
  index: number;
  title: string;
}

export const guideSectionShapeRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Guide sections use How To headings and contain structured numbered steps.",
      recommended: true,
    },
  },
  create(context) {
    return {
      root(node: Root) {
        if (!getFilename(context).endsWith("-guide.md")) return;

        const sections: GuideSection[] = [];
        for (const [index, child] of node.children.entries()) {
          if (child.type !== "heading" || child.depth === 1) continue;
          sections.push({ heading: child, index, title: getTextContent(child).trim() });
        }

        if (sections.length === 0) {
          context.report({ node, message: "guide must contain at least one How To section" });
          return;
        }

        for (const [sectionIndex, section] of sections.entries()) {
          if (section.heading.depth !== 2) {
            context.report({
              node: section.heading,
              message: `guide section heading "${section.title}" must be level two`,
            });
          }

          if (!/^How To \S/.test(section.title)) {
            context.report({
              node: section.heading,
              message: `guide section heading "${section.title}" must start with "How To "`,
            });
          }

          const nextSection = sections[sectionIndex + 1];
          const content = node.children.slice(section.index + 1, nextSection?.index ?? node.children.length);
          const hasOnlyNumberedList =
            content.length === 1 && content[0]?.type === "list" && content[0].ordered === true;
          const hasIntroductionThenNumberedList =
            content.length === 2 &&
            content[0]?.type === "paragraph" &&
            content[1]?.type === "list" &&
            content[1].ordered === true;
          if (!hasOnlyNumberedList && !hasIntroductionThenNumberedList) {
            context.report({
              node: section.heading,
              message: `guide section "${section.title}" must contain one numbered list, optionally preceded by one introductory paragraph`,
            });
          }
        }
      },
    };
  },
};
