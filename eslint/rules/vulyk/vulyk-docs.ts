/**
 * ESLint rule: pasika/vulyk-docs
 *
 * The framework distributes its documentation as tracked docs that a
 * repository consumes through vulyk rather than copying in. This rule runs on
 * package.json and verifies the repository has a `vulyk.config.ts` that tracks
 * the framework's docs from pasika, and the `AGENTS.md` agent file vulyk
 * generates for them.
 *
 * @see docs/framework-adoption-guide/rules/vulyk-docs-rule.md
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode } from "@humanwhocodes/momoa";

/** The pasika GitHub repository that hosts the framework's tracked docs. */
const PASIKA_REPO = "Bredansky/pasika";

export const vulykDocsRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require vulyk.config.ts to track the framework's docs from pasika and the generated AGENTS.md.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        if (!context.filename.endsWith("package.json")) return;
        const projectRoot = path.dirname(path.resolve(context.filename));

        const configPath = path.join(projectRoot, "vulyk.config.ts");
        if (!existsSync(configPath)) {
          context.report({
            node,
            message:
              "No vulyk.config.ts found. Run npx vulyk@latest init to create one that tracks the framework's docs.",
          });
          return;
        }

        const config = readFileSync(configPath, "utf8");
        if (!config.includes(PASIKA_REPO)) {
          context.report({
            node,
            message: "vulyk.config.ts must track the framework's docs from the pasika repository.",
          });
        }

        const agentsPath = path.join(projectRoot, "AGENTS.md");
        if (!existsSync(agentsPath)) {
          context.report({
            node,
            message:
              "No AGENTS.md found. Run npx vulyk@latest agents to generate the agent file that routes to the tracked docs.",
          });
        }
      },
    };
  },
};
