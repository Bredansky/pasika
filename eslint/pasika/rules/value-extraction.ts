/**
 * ESLint rule: pasika/value-extraction
 *
 * A value MUST remain in its declaring component or file until another file
 * imports it independently; it MUST then be extracted as a constant. A file
 * under src/app/ is supposed to hold only framework-convention files, so a
 * consumer outside src/app/ reaching into one means a value has crossed the
 * independence threshold.
 *
 * @see docs/code-organization-guide/rules/constants-rule.md
 */

import path from "node:path";
import type { Rule } from "eslint";
import { getProjectIndex } from "../project/index";
import { describeConsumers, segmentsOf } from "../project/ccf";

export const valueExtractionRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require a value imported independently to be extracted as a constant.",
    },
  },
  create(context) {
    const sourceRoot = path.resolve("src");
    const file = path.resolve(context.filename);
    const segments = segmentsOf(file, sourceRoot);
    if (segments.length === 0 || segments[0] !== "app") return {};

    const index = getProjectIndex(sourceRoot);
    if (!index) return {};

    const consumers = [...(index.consumers.get(file) ?? [])];
    const outsideApp = consumers.filter((consumer) => segmentsOf(consumer, sourceRoot)[0] !== "app");
    if (outsideApp.length === 0) return {};

    return {
      Program(node) {
        context.report({
          node,
          loc: { line: 1, column: 0 },
          message:
            `This file in src/app/ is imported by ${describeConsumers(outsideApp, sourceRoot)} ` +
            "outside src/app/. Extract the value to a shared or feature folder so it can be " +
            "imported independently. See docs/code-organization-guide/rules/constants-rule.md",
        });
      },
    };
  },
};
