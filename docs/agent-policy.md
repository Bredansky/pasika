# Agent Policy

Repo-wide requirements for AI agents working in this repository. They apply to every task an agent runs, whichever guide covers the code being changed.

## Browser Verification

- Browser behavior a task depends on MUST be verified with `agent-browser`.
- `agent-browser upgrade` MUST run before `agent-browser` is used in a task.
- An agent MAY discover available commands with `agent-browser --help` and command-specific usage with `agent-browser <command> --help`.

## Code Quality

- A commit MUST NOT use the `--no-verify` flag.
- Code MUST NOT use `eslint-disable` directives, and a reported violation MUST be fixed instead.
- A lint command MUST NOT pass ESLint's `--cache` flag, because rules that compare a file against the rest of the tree need every file in the run.
