/**
 * ESLint rule: pasika/tracked-docs
 *
 * The framework distributes its documentation as tracked docs that a
 * repository consumes through vulyk rather than copying in. This rule runs on
 * package.json and verifies the repository has a `vulyk.config.ts` that tracks
 * the framework's required tracked docs from pasika — `documentation-guide`,
 * `pasika-adoption-guide`, and `repository-policy` in any adopting repository,
 * plus `next-codebase-guide` and `next-tailwind-guide` in a Next.js app — and
 * the `AGENTS.md` agent file vulyk generates for them. The adjacent
 * vulyk-dependency rule keeps the typed config and CLI on the repository's
 * pinned Vulyk version.
 *
 * @see docs/pasika-adoption-guide/rules/vulyk-docs-rule.md
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { JSONRuleDefinition } from "@eslint/json";
import type { DocumentNode, MemberNode, ObjectNode } from "@humanwhocodes/momoa";

/** The pasika GitHub repository that hosts the framework's tracked docs. */
const PASIKA_REPO = "Bredansky/pasika";

/** The required tracked docs any framework-adopting repository must consume from pasika. */
const BASE_REQUIRED_TRACKED_DOCS = [
  { name: "documentation-guide", path: "docs/documentation-guide" },
  { name: "pasika-adoption-guide", path: "docs/pasika-adoption-guide" },
  { name: "repository-policy", path: "docs/repository-policy.md" },
] as const;

/** The tracked docs a Next.js app (the pasikaNextjsApp preset, which includes pasikaApp) must additionally track. */
const NEXTJS_REQUIRED_TRACKED_DOCS = [
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

export const trackedDocsRule: JSONRuleDefinition = {
  meta: {
    schema: [],
    type: "problem",
    docs: {
      description:
        "Require vulyk.config.ts to track the framework's required tracked docs from pasika and the generated AGENTS.md.",
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
              "No vulyk.config.ts found. Run npx vulyk init to create one that tracks the framework's required tracked docs.",
          });
          return;
        }

        const config = readFileSync(configPath, "utf8");
        if (!config.includes(PASIKA_REPO)) {
          context.report({
            node,
            message: "vulyk.config.ts must track the framework's required tracked docs from the pasika repository.",
          });
          return;
        }

        const requiredTrackedDocs = hasDependency(root, "next")
          ? [...BASE_REQUIRED_TRACKED_DOCS, ...NEXTJS_REQUIRED_TRACKED_DOCS]
          : BASE_REQUIRED_TRACKED_DOCS;
        for (const trackedDoc of requiredTrackedDocs) {
          if (!config.includes(trackedDoc.path)) {
            context.report({
              node,
              message: `vulyk.config.ts must track the framework's ${trackedDoc.name} tracked docs from pasika (${PASIKA_REPO}/${trackedDoc.path}).`,
            });
          }
        }

        const agentsPath = path.join(projectRoot, "AGENTS.md");
        if (!existsSync(agentsPath)) {
          context.report({
            node,
            message:
              "No AGENTS.md found. Run npx vulyk agents to generate the agent file that routes to the tracked docs.",
          });
        }
      },
    };
  },
};
