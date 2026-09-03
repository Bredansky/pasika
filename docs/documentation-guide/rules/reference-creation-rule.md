# Reference Creation Rule

References without a consistent creation process scatter lookup material. This rule defines how to create a Reference document.

- Reference file names MUST match the document title in kebab-case and use the `-reference` suffix (e.g., `foo-reference.md`).
- A Reference MUST NOT link to Rules, Guides, Policy documents, or other References.
- A Reference MUST NOT state a constraint the reader has to satisfy in RFC 2119 vocabulary; such a constraint MUST live in a Rule.
- A Reference overview and the overview of each headed lookup block MUST contain one or two short sentences, and MUST NOT contain instructions or links to other documentation.
- A Reference with a single lookup block MUST NOT add a section heading for it.
- A Reference with two or more lookup blocks MUST add a section heading for every block, including the first.

## Incorrect — Reference Links to Another Document

```markdown
- See the [Naming Rule](../rules/naming-rule.md) for the file naming conventions.
```

Why: reference body contains a reference to another Rule.

## Correct — Reference States the Lookup Fact Directly

```markdown
- File names are kebab-case, match the document title, and have a `-reference` suffix.
```

Why: reference states lookup content directly without linking to its source.

## Incorrect — Reference Uses Requirement Vocabulary

```markdown
| Layer | Contents                                          |
| ----- | ------------------------------------------------- |
| `app` | Routing files only — a route MUST NOT hold a util |
```

Why: the cell carries RFC 2119 vocabulary, so a Reference asserts a requirement that only a Rule can own, and the same constraint ends up stated in two documents.

## Correct — Reference Describes Existing Content

```markdown
| Layer | Contents           |
| ----- | ------------------ |
| `app` | Routing files only |
```

Why: the cell describes what the layer holds, leaving the requirement to the Rule that owns it.

## Incorrect — Reference States a Constraint Without RFC 2119 Vocabulary

```markdown
| Layer      | Path                      | Permitted contents                                                        |
| ---------- | ------------------------- | ------------------------------------------------------------------------- |
| `features` | `src/features/<feature>/` | `src/features/` itself holds feature folders only — never support folders |
```

Why: the cell reads as description but tells the reader what is forbidden, so the constraint has no Rule that owns it and can be changed in the Reference without anyone noticing the Rule now disagrees.

## Correct — Reference Describes and the Rule Constrains

```markdown
| Layer      | Path                      | Contents                                  |
| ---------- | ------------------------- | ----------------------------------------- |
| `features` | `src/features/<feature>/` | One folder per feature, holding its files |
```

Why: the Reference says what the layer contains, and the Rule that owns the structure states what may not appear there.

## Incorrect — Single Lookup Block Has a Heading

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

Why: section heading is unnecessary and forces duplicated overviews covering what the Reference is for and what the lookup block contains.

## Correct — Single Lookup Block Has No Heading

```markdown
# Option Reference

Use this reference to choose between the two supported project sizes when starting a new initiative.

| Option | Use Case       |
| ------ | -------------- |
| A      | Small projects |
| B      | Large projects |
```

Why: the single lookup block sits directly under the Reference overview without a heading.

## Incorrect — First of Multiple Lookup Blocks Has No Heading

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

Why: the Reference has two lookup blocks but only the second is headed, so the first table reads as part of the overview and cannot be scanned or linked as a group of its own.

## Correct — Every Lookup Block Has a Heading

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
