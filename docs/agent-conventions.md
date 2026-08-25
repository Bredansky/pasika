# Agent Conventions

Repo-wide requirements for AI agents working in this repository. They apply to every task, whichever guide covers the code being changed.

## Data Contracts

- Runtime validation MUST use Zod schemas rather than ad hoc type guards.
- A data contract's fields MUST be required unless runtime evidence shows they are optional or nullable.
- A change MUST update every in-repo call site rather than preserve backward compatibility, unless the user asks for compatibility.

## Dependencies

- A dependency MUST be installed at its latest stable version.
- A dependency version SHOULD use a caret range so patch and minor releases arrive without a manual bump.

## Code Quality

- Code MUST NOT use `eslint-disable` directives, and a reported violation MUST be fixed instead.
- A lint command MUST NOT pass ESLint's `--cache` flag, because rules that compare a file against the rest of the tree need every file in the run.
- A commit MUST NOT use the `--no-verify` flag.

## Browser Verification

- Browser behavior a task depends on MUST be verified with `agent-browser`.
- `agent-browser upgrade` MUST run before `agent-browser` is used in a task.
- An agent MAY discover available commands with `agent-browser --help` and command-specific usage with `agent-browser <command> --help`.

## Managed Documentation

- A change to the Vulyk registry MUST use Vulyk commands rather than edits to generated files.
- A file listed in a `.vulyk` manifest MUST NOT be edited by hand.
- Vulyk MUST run as an ephemeral command such as `npx vulyk@latest`.
- Vulyk MUST NOT be added to `package.json` in order to run its CLI.
