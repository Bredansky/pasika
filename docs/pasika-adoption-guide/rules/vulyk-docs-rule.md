# Vulyk Docs Rule

The framework distributes its documentation as tracked docs that a repository consumes through `vulyk` rather than copying in. This rule requires a pinned Vulyk development tool, a config that tracks the framework's required docs from `pasika`, and generated agent files that route to them.

- A repository adopting the framework MUST list `vulyk` in `devDependencies` rather than `dependencies` so `vulyk.config.ts` is typechecked and the repository resolves a pinned CLI.
- A repository adopting the framework MUST track the framework's `documentation-guide`, `pasika-adoption-guide`, and `repository-policy` docs from `pasika` in `vulyk.config.ts`.
- A repository adopting the framework's Next.js app preset MUST additionally track the framework's `next-codebase-guide` and `next-tailwind-guide` docs from `pasika` in `vulyk.config.ts`.
- A repository adopting the framework MUST have the `AGENTS.md` agent file that `vulyk` generates for the tracked docs.

## Incorrect — Vulyk Missing From the Toolchain

```json
{
  "devDependencies": {
    "typescript": "6.0.3"
  }
}
```

Why: the TypeScript project cannot resolve the type imported by `vulyk.config.ts`, and an ephemeral CLI can differ between runs.

## Correct — Vulyk Pinned as a Development Tool

```json
{
  "devDependencies": {
    "typescript": "6.0.3",
    "vulyk": "0.15.0"
  }
}
```

Why: the config and CLI resolve the same exact Vulyk release without adding it to the production dependency graph.

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
    "next-codebase-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/next-codebase-guide",
      targets: ["."],
    },
    "next-tailwind-guide": {
      source: "https://github.com/Bredansky/pasika/tree/main/docs/next-tailwind-guide",
      targets: ["."],
    },
  },
});
```

Why: `vulyk` installs the framework's docs as managed files pinned to a commit (`vulyk add` writes the commit SHA into the source), and the generated `AGENTS.md` routes an agent to them.
