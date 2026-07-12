# Reference Creation Rule

References without a consistent creation process scatter lookup material. This rule defines how to create a Reference document.

- Reference file names MUST match the document title in kebab-case and use the `-reference` suffix (e.g., `foo-reference.md`).
- A Reference MUST NOT link to Rules, Guides, or other References.
- A Reference with a single lookup block MUST NOT add a section heading for it.

## Incorrect

```markdown
- See the [Naming Rule](../rules/naming-rule.md) for the file naming conventions.
```

Why: reference body contains a reference to another Rule.

## Correct

```markdown
- File names are kebab-case, match the document title, and have a `-reference` suffix.
```

Why: reference states lookup content directly without linking to its source.

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
