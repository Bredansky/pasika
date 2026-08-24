# pasika

Reusable agent setup package, starting with Claude.

`pasika` stores portable agent setup assets that individual repos can apply or adapt. Today it focuses on Claude, with room for Codex and other agent-specific setup flows later.

## Scope

This repo intentionally starts narrow:

- Claude first for v1
- reusable agent setup assets only
- shared docs at the repo root
- no project-specific workflows or business logic

## Layout

```text
claude/
  settings.base.json
  hooks/
    status-line/
      index.js
    notification.sh
    protect-files.sh
  scripts/
    render-settings.ts
docs/
  claude/
  code-organization-guide/
  documentation-guide/
  styling-guide/
  agent-conventions.md
eslint/
  pasika/
    rules/
scripts/
  pasika.ts
  generate-vulyk-json.ts
vulyk.config.ts              # typed config (source of truth)
vulyk.json                   # generated from vulyk.config.ts
dist/
  ...
AGENTS.md
CLAUDE.md
```

## What belongs here

- portable setup scripts
- base settings templates
- shared docs and generated `CLAUDE.md`
- shared naming and layout conventions
- reusable source-organization lint rules

## What stays in project repos

- final agent config folders in project repos
- project-specific rules, agents, and prompts
- repository-specific plugin choices
- scripts that depend on a specific app, CI setup, or codebase

## CLI

The current entry point is:

```bash
npx pasika claude
```

Optional flags:

- `--target-dir <path>` writes into another repo
- `--force` replaces an existing generated file instead of merging

## Development

The CLI source lives in TypeScript.

```bash
npm run lint
npm run typecheck
npm run build
```

`npm run build` compiles the TypeScript source. `npm run docs:generate` regenerates `vulyk.json` from `vulyk.config.ts`, then runs `vulyk docs` to emit root `AGENTS.md` and `CLAUDE.md`.

## Recommended Integration

Hooks and helper executables should come from `node_modules`.

That gives us:

- versioned reusable scripts
- easy upgrades through the package manager
- no manual copying of hook files into every repo

`settings.json` is different. It still needs to exist in each project repo, because Claude Code does not give us a clean inheritance model for it.

So the recommended pattern is:

1. install `pasika` as a dev dependency
2. run `npx pasika claude`
3. generate or merge into `.claude/settings.json` in the project
4. point hook commands at `./node_modules/pasika/claude/...`
5. keep project-specific plugin, skill, and rule decisions in the project repo

`npx pasika claude` also copies the packaged Claude hooks docs into `.claude/hooks/` in the target repo.

## ESLint Pasika Ruleset

Pasika ships enforceable lint rules derived from its documentation. Each rule carries a `@see` annotation linking to its source doc so future audits can verify rule/doc alignment.

### Usage with Zirka (recommended)

Enable pasika through Zirka's `styleguide`:

```ts
// eslint.config.ts
import { RuleSeverity, styleguide } from "zirka";

const { eslintConfig } = styleguide({
  next: RuleSeverity.Error,
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  pasika: RuleSeverity.Error,
});

export default eslintConfig;
```

### Usage without Zirka

Import the config directly and compose with your own:

```ts
// eslint.config.ts
import { pasikaConfig } from "pasika/eslint";
import { RuleSeverity, styleguide } from "zirka";

const { eslintConfig } = styleguide({
  next: RuleSeverity.Error,
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
});

export default [...((await eslintConfig) ?? []), pasikaConfig];
```

### Rule → Doc Mapping

Every rule's source file declares the documentation it enforces. Use this table to trace a lint hit back to its reasoning:

| Rule | Enforces | Source Doc |
|---|---|---|
| `pasika/filename-case` | Smart/PascalCase vs dumb/kebab-case file names | `docs/code-organization-guide/rules/smart-vs-dumb-component-rule.md` |
| `pasika/organization-imports` | Relative vs `@/*` imports, layer boundaries | `docs/code-organization-guide/rules/exports-and-imports-rule.md` |
| `pasika/no-mixed-concerns` | One React component per `.tsx` file | `docs/code-organization-guide/rules/no-mixed-concerns-rule.md` |
| `pasika/no-arbitrary-tailwind` | No arbitrary `-[value]` Tailwind classes | `docs/styling-guide/rules/arbitrary-value-rule.md` |
| `pasika/enforce-cn-merge` | Use `cn()` not `+`/template literals; ≤5 classes per group | `docs/styling-guide/rules/class-composition-rule.md` |
| `pasika/enforce-cva-variant-props` | Use `VariantProps<typeof>` not manual union types | `docs/styling-guide/rules/component-variant-rule.md` |
| `pasika/enforce-barrel-exports` | Nested `index.ts` only re-exports the parent component | `docs/code-organization-guide/rules/folder-nesting-rule.md` |

## Vulyk Config

Pasika declares its tracked documentation entries in a typed `vulyk.config.ts` file. This gives editors intellisense and JSDoc descriptions for every field. The runtime `vulyk.json` is generated from it:

```bash
npm run config:generate   # vulyk.config.ts → vulyk.json
npm run docs:generate     # config:generate + vulyk docs
```

Consumer projects reference pasika's docs through their own `vulyk.json` entries pointing at tagged pasika commits on GitHub.
