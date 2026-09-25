import type { VulykConfig } from "vulyk/config";

const defineConfig = (config: VulykConfig): VulykConfig => config;

export default defineConfig({
  groups: {
    docs: {
      agents: ["AGENTS.md"],
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
  },
});
