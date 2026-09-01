/**
 * ESLint rule: pasika/vulyk-docs
 *
 * The framework distributes its documentation as tracked docs that a
 * repository consumes through vulyk rather than copying in. This rule runs on
 * package.json and verifies the repository has a `vulyk.config.ts` that tracks
 * the framework's required docs from pasika — the documentation, adoption, and
 * repository-policy docs in any adopting repository, plus the code-organization
 * and styling docs in a Next.js app — and the `AGENTS.md` agent file vulyk
 * generates for them.
 *
 * @see docs/pasika-adoption-guide/rules/vulyk-docs-rule.md
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode, ObjectNode } from "@humanwhocodes/momoa";

/** The pasika GitHub repository that hosts the framework's tracked docs. */
const PASIKA_REPO = "Bredansky/pasika";

/** Docs any framework-adopting repository must track from pasika. */
const BASE_REQUIRED_DOCS = [
  { name: "documentation-guide", path: "docs/documentation-guide" },
  { name: "pasika-adoption-guide", path: "docs/pasika-adoption-guide" },
  { name: "repository-policy", path: "docs/repository-policy.md" },
] as const;

/** Docs a Next.js app (the nextjsApp preset, which includes typescriptApp) must additionally track. */
const NEXTJS_REQUIRED_DOCS = [
  { name: "next-codebase-guide", path: "docs/next-codebase-guide" },
  { name: "next-tailwind-guide", path: "docs/next-tailwind-guide" },
] as const;

function memberName(member: MemberNode): string {
  return member.name.type === "String" ? member.name.value : member.name.name;
}

function hasDependency(root: ObjectNode, name: string): boolean {
  const section = root.members.find((member) => memberName(member) === "dependencies");
  if (section?.value.type !== "Object") return false;
  return section.value.members.some((member) => memberName(member) === name);
}

export const vulykDocsRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description: "Require vulyk.config.ts to track the framework's required docs from pasika and the generated AGENTS.md.",
    },
  },
  create(context) {
    return {
      Document(node: DocumentNode) {
        if (!context.filename.endsWith("package.json")) return;
        const root = node.body;
        if (root.type !== "Object") return;
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
          return;
        }

        const requiredDocs = hasDependency(root, "next")
          ? [...BASE_REQUIRED_DOCS, ...NEXTJS_REQUIRED_DOCS]
          : BASE_REQUIRED_DOCS;
        for (const doc of requiredDocs) {
          if (!config.includes(doc.path)) {
            context.report({
              node,
              message: `vulyk.config.ts must track the framework's ${doc.name} docs from pasika (${PASIKA_REPO}/${doc.path}).`,
            });
          }
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
