# Guide Creation Rule

Guides without a consistent creation process invent their own structure every time. This rule defines how to create a Guide document.

- Each How To step MUST be concise and use one sentence.
- Each How To step MUST link at most one Rule or one Reference.
- When a step links a Rule or Reference, the step MUST name the concrete decision or result the reader will have after reading it.
- How To sections MUST NOT nest inside other How To sections.
- Guide file names MUST match the document title in kebab-case and use the `-guide` suffix (e.g., `foo-guide.md`).
- A Guide with private support files MUST become a folder named the same as its entry-point file, without the `.md` extension.
- Private Rule files for a Guide MUST live in a `rules/` subfolder inside the Guide's folder.
- Private Reference files for a Guide MUST live in a `references/` subfolder inside the Guide's folder.
- Colocated Reference files owned by a Guide MUST NOT contain references to Rules or other References.
- Guide documents MUST NOT use uppercase RFC 2119 keywords to state rules.
- Shared Rules and References MUST live at the nearest shared docs level instead of inside one private Guide folder.

## Incorrect

```text
feature-workflow-guide/
├── feature-workflow-guide.md
├── naming-rule.md
└── option-reference.md
```

Why: mixed Markdown files turn the doc folder into an undifferentiated list once the doc grows.

## Correct

```text
feature-workflow-guide/
├── feature-workflow-guide.md
├── rules/
│   └── naming-rule.md
└── references/
    └── option-reference.md
```

Why: private support files stay colocated with the entry point while being grouped by document kind.

## Incorrect

```markdown
1. Follow the [Naming Rule](rules/naming-rule.md) and the [Layout Rule](rules/layout-rule.md) so the doc looks right.
```

Why: step links two Rules and does not name a concrete decision or result.

## Correct

```markdown
1. Follow the [Naming Rule](rules/naming-rule.md) so the doc has a predictable file name.
```

Why: step links one Rule and names the concrete result the reader will have.

## Incorrect

```markdown
## How To Deploy

1. Build the project.
   ### How To Build
   1. Run the build script.
```

Why: a How To section nests inside a step of another How To section.

## Correct

```markdown
## How To Deploy

1. Build the project. See [How To Build](#how-to-build) below.

## How To Build

1. Run the build script.
```

Why: How To sections stay flat and reference each other via links.

## Incorrect

```markdown
1. Name the file. The file MUST use kebab-case.
```

Why: guide states a rule using an uppercase RFC 2119 keyword.

## Correct

```markdown
1. Name the file in kebab-case.
```

Why: guide gives instructions without using RFC 2119 keywords.

## Incorrect

```markdown
1. First, check the configuration file. Then verify all required fields are present. After that, confirm none of the fields contain invalid values.
```

Why: step uses multiple sentences instead of one concise sentence.

## Correct

```markdown
1. Run the config check script.
```

Why: step is one concise sentence with a concrete action.

## Incorrect

```text
docs/
└── deployment-guide/
    ├── deployment-guide.md
    └── references/
        └── shared-options-reference.md
```

Why: shared reference used by multiple guides is buried inside one guide's private folder.

## Correct

```text
docs/
├── deployment-guide/
│   └── deployment-guide.md
└── references/
    └── shared-options-reference.md
```

Why: shared reference lives at the nearest shared docs level accessible to all guides.
