# Reference Creation Rule

References without a consistent creation process scatter lookup material across the repository. This rule defines how to create a Reference document.

- Reference file names MUST match the document title in kebab-case and use the `-reference` suffix (e.g., `foo-reference.md`).
- A Reference can only have colocated Rule files.
- A Reference MAY refer only to Rules.
- A Reference with a single lookup block MUST NOT add a section heading for it.

## Incorrect

```text
docs/
└── option-reference.md
    → [another-reference.md]
```

Why: reference links to another Reference instead of only to Rules.

## Correct

```text
docs/
└── option-reference.md
```

Why: a Reference has no links to other References.

## Incorrect

```markdown
Use kebab-case for file names. Do not use spaces or uppercase letters.
```

Why: reference duplicates rule content that can drift. Linking to the Rule avoids drift and is permitted.

## Correct

```markdown
Use the [Naming Rule](../rules/naming-rule.md) for file name conventions.
```

Why: reference links to a Rule, which is permitted and avoids duplicating rule content.

## Incorrect

```markdown
# Option Reference

Use this reference to choose between the two supported project sizes when starting a new initiative.

## Options

Pick the size that matches the team's headcount and timeline.

| Option | Use Case |
|--------|----------|
| A      | Small projects |
| B      | Large projects |
```

Why: section heading is unnecessary and forces a duplicated intro covering what the reference is for and what the group contains.

## Correct

```markdown
# Option Reference

Use this reference to choose between the two supported project sizes when starting a new initiative.

| Option | Use Case |
|--------|----------|
| A      | Small projects |
| B      | Large projects |
```

Why: single lookup block sits directly under the intro without a heading.
