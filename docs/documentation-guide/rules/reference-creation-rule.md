# Reference Creation Rule

References without a consistent creation process scatter lookup material. This rule defines how to create a Reference document.

- Reference file names MUST match the document title in kebab-case and use the `-reference` suffix (e.g., `foo-reference.md`).
- A Reference MUST NOT link to Rules, Guides, or other References.
- A Reference MUST NOT use RFC 2119 vocabulary (`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`), because lookup material describes what exists rather than imposing requirements.
- A Reference with a single lookup block MUST NOT add a section heading for it.
- A Reference with two or more lookup blocks MUST add a section heading for every block, including the first.

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
| Layer | Contents                                          |
| ----- | ------------------------------------------------- |
| `app` | Routing files only — a route MUST NOT hold a util |
```

Why: the cell carries RFC 2119 vocabulary, so a Reference asserts a requirement that only a Rule can own, and the same constraint ends up stated in two documents.

## Correct

```markdown
| Layer | Contents           |
| ----- | ------------------ |
| `app` | Routing files only |
```

Why: the cell describes what the layer holds, leaving the requirement to the Rule that owns it.

## Incorrect

```markdown
# Option Reference

Use this reference to choose between the two supported project sizes when starting a new initiative.

## Options

Pick the size that matches the team's headcount and timeline.

| Option | Use Case       |
| ------ | -------------- |
| A      | Small projects |
| B      | Large projects |
```

Why: section heading is unnecessary and forces a duplicated intro covering what the reference is for and what the group contains.

## Correct

```markdown
# Option Reference

Use this reference to choose between the two supported project sizes when starting a new initiative.

| Option | Use Case       |
| ------ | -------------- |
| A      | Small projects |
| B      | Large projects |
```

Why: single lookup block sits directly under the intro without a heading.

## Incorrect

```markdown
# Option Reference

Use this reference to look up the supported project sizes and the review gates each one requires.

| Option | Use Case       |
| ------ | -------------- |
| A      | Small projects |
| B      | Large projects |

## Review Gates

Each size carries a different approval bar.

| Option | Approvals |
| ------ | --------- |
| A      | 1         |
| B      | 2         |
```

Why: the reference has two lookup blocks but only the second is headed, so the first table reads as part of the intro and cannot be scanned or linked as a group of its own.

## Correct

```markdown
# Option Reference

Use this reference to look up the supported project sizes and the review gates each one requires.

## Project Sizes

Pick the size that matches the team's headcount and timeline.

| Option | Use Case       |
| ------ | -------------- |
| A      | Small projects |
| B      | Large projects |

## Review Gates

Each size carries a different approval bar.

| Option | Approvals |
| ------ | --------- |
| A      | 1         |
| B      | 2         |
```

Why: both lookup blocks are headed, so they read as peers and each is independently scannable and linkable.
