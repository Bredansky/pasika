# Policy Creation Rule

Some requirements apply to the whole repository and span subjects too unrelated to share one Rule. This rule defines how to collect them in one document without turning it into a dumping ground.

- Policy file names MUST match the document title in kebab-case and use the `-policy` suffix (e.g., `foo-policy.md`).
- A Policy overview MUST contain one or two short sentences naming the scope the requirements apply to.
- A Policy document MUST state every requirement as a bullet that uses RFC 2119 vocabulary.
- A Policy document MUST group its bullets under a heading per subject.
- A Policy document MUST NOT contain Incorrect/Correct examples, and a requirement that a reader cannot apply without one MUST live in a Rule instead.
- A Policy document MUST NOT link to Rules, References, Guides, or other Policy documents.

## Incorrect — Policy Document Carries Examples

```markdown
# Agent Policy

## Code Quality

- Code MUST NOT use `eslint-disable` directives.

## Incorrect — Suppressed Violation

// invoice.tsx
// eslint-disable-next-line pasika/filename-case

Why: the violation is hidden instead of fixed.
```

Why: the document pairs a repo-wide requirement with a worked example, so it competes with the Rule shape and grows one section per requirement.

## Correct — Policy Document Lists Requirements Only

```markdown
# Agent Policy

## Code Quality

- Code MUST NOT use `eslint-disable` directives.
- Commits MUST NOT use the `--no-verify` flag.

## Data Contracts

- Runtime validation MUST use Zod schemas.
```

Why: each requirement is short enough to apply without an example, and unrelated subjects sit under their own headings.
