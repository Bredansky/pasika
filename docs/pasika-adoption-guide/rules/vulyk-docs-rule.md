# Vulyk Docs Rule

The framework distributes its documentation as tracked docs that a repository consumes through `vulyk` rather than copying in. This rule requires the repository's `vulyk.config.ts` to track the framework's required docs from `pasika` and the agent files that route to them to be generated.

- A repository adopting the framework MUST track the framework's `documentation-guide`, `pasika-adoption-guide`, and `repository-policy` docs from `pasika` in `vulyk.config.ts`.
- A repository adopting the framework's Next.js app preset MUST additionally track the framework's `code-organization-guide` and `styling-guide` docs from `pasika` in `vulyk.config.ts`.
- A repository adopting the framework MUST have the `AGENTS.md` agent file that `vulyk` generates for the tracked docs.

## Incorrect — Required Docs Missing

```ts
// vulyk.config.ts
import { defineConfig } from "vulyk/config";

export default defineConfig({
  entries: {
    "documentation-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/documentation-guide",
      targets: ["."],
    },
  },
});
```

Why: the config tracks only the documentation guide, so the adoption guide and repository policy — and, in a Next.js app, the code-organization and styling guides — never reach the repository.

## Correct — Pasika Docs Tracked and the Agent File Generated

```ts
// vulyk.config.ts
import { defineConfig } from "vulyk/config";

export default defineConfig({
  entries: {
    "documentation-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/documentation-guide",
      targets: ["."],
    },
    "pasika-adoption-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/pasika-adoption-guide",
      targets: ["."],
    },
    "repository-policy": {
      source: "https://github.com/Bredansky/pasika/blob/main/docs/repository-policy.md",
      targets: ["."],
    },
    "code-organization-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/code-organization-guide",
      targets: ["."],
    },
    "styling-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/styling-guide",
      targets: ["."],
    },
  },
});
```

Why: `vulyk` installs the framework's docs as managed files pinned to a commit (`vulyk add` writes the commit SHA into the source), and the generated `AGENTS.md` routes an agent to them.
