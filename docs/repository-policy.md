# Repository Policy

Repo-wide requirements for the repository's code, tooling, and documentation. They apply to every change, whichever guide covers the code being modified.

## Data Contracts

- Runtime validation MUST use Zod schemas rather than ad hoc type guards.
- A data contract's fields MUST be required unless runtime evidence shows they are optional or nullable.
- A change MUST update every in-repo call site rather than preserve backward compatibility, unless the user asks for compatibility.

## Linting and Formatting

- A repository MUST take its lint, format, and TypeScript configuration from `zirka` and its rules from `pasika` rather than restating them locally.

## Documentation Management

- Documentation written outside this repository MUST be consumed through Vulyk rather than copied in.
- A change to the Vulyk registry MUST use Vulyk commands rather than edits to generated files.
- A file listed in a `.vulyk` manifest MUST NOT be edited by hand.
- Vulyk MUST run as an ephemeral command such as `npx vulyk@latest`.
- Vulyk MUST NOT be added to `package.json` in order to run its CLI.
