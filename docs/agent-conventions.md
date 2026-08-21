# Agent Conventions

Repo-wide engineering rules and commit hygiene for AI agents.

## Data Contracts

- Use Zod schemas for runtime validation; prioritize them over ad hoc type guards.
- Prefer strict-by-default data contracts. Make fields required unless real runtime evidence shows they must be nullable or optional.
- Do not preserve backward compatibility by default. Prefer simplifying and updating all in-repo call sites unless the user explicitly asks for compatibility.

## Code Quality

- Never use `eslint-disable` directives. Fix issues properly.
- Never commit with the `--no-verify` flag.

## Browser Verification

- Use `agent-browser` to verify browser behavior when a task requires it.
- Before using `agent-browser`, run `agent-browser upgrade`.
- Run `agent-browser --help` for available commands and `agent-browser <command> --help` for command-specific usage.

## Vulyk

- Make Vulyk registry changes with Vulyk commands, not by editing generated files.
- Treat `AGENTS.md`, `docs/external`, `.agents/skills`, and `.vulyk` as generated output.
- Use ephemeral commands such as `npx vulyk@latest ...`.
- Do not add Vulyk to `package.json` only to run the CLI.
