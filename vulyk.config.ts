import type { VulykConfig } from "vulyk/config";

const defineConfig = (config: VulykConfig): VulykConfig => config;

export default defineConfig({
  groups: {
    docs: {
      agents: ["AGENTS.md"],
    },
    skills: {
      outputPaths: [".agents/skills"],
      validate: {
        mustContain: ["SKILL.md"],
      },
      gitIgnore: false,
    },
  },
  entries: {
    "documentation-guide": {
      source: "docs/documentation-guide/documentation-guide.md",
      group: "docs",
      targets: ["docs/**"],
      description:
        "Consult before writing or editing documentation: document templates, Rule shape, example headings, and RFC 2119 requirements.",
    },
    "vercel-react-best-practices": {
      source:
        "https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices",
      group: "skills",
    },
  },
});
