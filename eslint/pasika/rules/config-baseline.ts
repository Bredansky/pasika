/**
 * ESLint rule: pasika/config-baseline
 *
 * The project's eslint config MUST reference zirka. This rule runs on
 * the eslint config file itself and checks that it imports or references
 * zirka somewhere in its content.
 *
 * @see docs/repository-policy.md
 */

import fs from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";

export const configBaselineRule: Rule.RuleModule = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require eslint config to reference zirka and tsconfig.json to exist.",
    },
  },
  create(context) {
    const filename = path.resolve(context.filename);
    const basename = path.basename(filename);

    // Only run on eslint config files
    if (!/^eslint\.config\.(?:ts|mts|cts|js|mjs|cjs)$/.test(basename)) return {};

    return {
      Program(node) {
        const content = fs.readFileSync(filename, "utf8");

        // Check eslint config references zirka
        if (!content.includes("zirka")) {
          context.report({
            node,
            loc: { line: 1, column: 0 },
            message: "ESLint config must reference zirka. Use the pasika/zirka baseline configuration.",
          });
        }

        // Check tsconfig.json exists
        const projectRoot = path.dirname(filename);
        if (!fs.existsSync(path.join(projectRoot, "tsconfig.json"))) {
          context.report({
            node,
            loc: { line: 1, column: 0 },
            message: "No tsconfig.json found. Create one extending the pasika baseline.",
          });
        }
      },
    };
  },
};
