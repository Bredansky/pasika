# Vulyk Docs Rule

The framework distributes its documentation as tracked docs that a repository consumes through `vulyk` rather than copying in. This rule requires the repository's `vulyk.config.ts` to track the framework's docs from `pasika` and the agent files that route to them to be generated.

- A repository adopting the framework MUST track the framework's docs from `pasika` in `vulyk.config.ts`.
- A repository adopting the framework MUST have the `AGENTS.md` agent file that `vulyk` generates for the tracked docs.

## Incorrect — Docs Tracked From Somewhere Else

```ts
// vulyk.config.ts
import { defineConfig } from "vulyk/config";

export default defineConfig({
  entries: {
    "random-docs": {
      source: "https://github.com/someone/else/blob/main/docs.md",
      targets: ["."],
    },
  },
});
```

Why: the config tracks docs from another repository, so the framework's own docs never reach the repository and the agent file that routes to them is never generated.

## Correct — Pasika Docs Tracked and the Agent File Generated

```ts
// vulyk.config.ts
import { defineConfig } from "vulyk/config";

export default defineConfig({
  entries: {
    "framework-docs": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs",
      targets: ["."],
      agents: ["AGENTS.md"],
    },
  },
});
```

Why: `vulyk` installs the framework's docs as managed files pinned to a commit (`vulyk add` writes the commit SHA into the source), and the generated `AGENTS.md` routes an agent to them.
