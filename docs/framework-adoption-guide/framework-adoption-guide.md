# Framework Adoption Guide

This guide covers how a repository starts using the framework, how it moves to a later framework release, and how it plans the work either one requires. It applies to any repository that consumes the framework's packages and documentation.

## How To Adopt the Framework in a Repository

Run this once, when a repository starts using the framework.

1. Read the [Glossary Reference](references/glossary-reference.md) to learn the terms these workflows use.
2. Read the [Tech Stack Reference](references/tech-stack-reference.md) to learn which packages the framework requires and what each one is responsible for.
3. Run `npx pasika init` to install the framework packages and write the lint, format, TypeScript, git-hook, and documentation configuration.
4. Run `npx pasika doctor` to list every remaining gap between the repository and the framework baseline.
5. Fix each gap the report names, starting with the packages and configuration it lists first.
6. Run `npm run lint` to list the code and structure violations the framework's ruleset reports.
7. Follow [How To Plan the Work an Adoption or Update Requires](#how-to-plan-the-work-an-adoption-or-update-requires) when that list is too large to fix in one pass.
8. Repeat steps 4 to 6 until both commands report no findings.

## How To Update a Repository to the Latest Framework Release

Run this whenever the framework publishes a release.

1. Run `npx pasika update` to move the framework packages and every tracked doc to their latest release.
2. Read the update report to learn which tracked documents changed since the repository's last release.
3. Run `npx pasika doctor` to list the gaps the new release introduced.
4. Run `npm run lint` to list the violations the new and changed rules report.
5. Follow [How To Plan the Work an Adoption or Update Requires](#how-to-plan-the-work-an-adoption-or-update-requires) when the combined list is too large to fix in one pass.
6. Repeat steps 3 and 4 until both commands report no findings.

## How To Plan the Work an Adoption or Update Requires

Use this when the reported findings are too large to fix in one change set.

1. Group every finding by the document its message names so each group has one source of truth.
2. Order the groups so file placement lands before file naming, and file naming before import paths.
3. Turn each group into one milestone that leaves the repository lint-clean when it lands.
4. Record the milestone list and each group's finding count before changing any code.
5. Complete one milestone per change set, re-running `npx pasika doctor` and `npm run lint` before starting the next.
6. Re-plan the remaining milestones whenever fixing one reveals findings that belong to another group.
