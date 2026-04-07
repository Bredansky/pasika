# pasika

`pasika` is a reusable Claude Code base package.

## Scope

- Claude only for v1
- shared hooks and base settings
- merge-friendly project integration
- no project-specific skills, rules, or plugin choices

## Usage

Install `pasika` as a dev dependency, then run:

```bash
npx pasika claude
```

That generates or updates `.claude/settings.json` to point shared hooks at `./node_modules/pasika/claude/...`.
