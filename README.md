# pasika

Reusable base assets for Claude Code setups.

`pasika` stores portable Claude base config assets and reusable Claude skills that individual repos can copy from or adapt.

## Scope

This repo intentionally starts narrow:

- Claude only for v1
- reusable base config only
- shared docs at the repo root
- no project-specific rules, workflows, or business logic

## Layout

```text
claude/
  scripts/
    render-settings.ts
  .claude/
    settings.base.json
    hooks/
      status-line/
        index.js
      notification.sh
      protect-files.sh
    skills/
      doc-drift-review/
        SKILL.md
docs/
  common/
    overview.md
    merge-behavior.md
  claude/
    hooks.md
scripts/
  pasika.ts
dist/
  ...
vulyk.json
AGENTS.md
CLAUDE.md
```

## What belongs here

- portable hook scripts
- base settings templates
- shared Claude skills that are not tied to one app
- shared docs and generated `CLAUDE.md`
- shared naming and layout conventions

## What stays in project repos

- final `.claude` folders
- project-specific rules, agents, and prompts
- repository-specific plugin choices
- scripts that depend on a specific app, CI setup, or codebase

## CLI

The main entry point is:

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

`npm run build` uses `vulyk docs` to emit root `AGENTS.md` and `CLAUDE.md`.

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

## Merge Behavior

By default, `pasika` merges its Claude base into an existing `.claude/settings.json`.

That means:

- it updates the portable base pieces shipped by `pasika`
- it preserves unrelated project-specific settings such as extra hooks, plugin config, and custom permissions

Use `--force` only when you want to replace the existing file with the `pasika` base output.
