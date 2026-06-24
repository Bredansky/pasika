# Documentation Direction Rule

Documentation types need a single dependency direction. Without one, workflows, enforcement, and lookup material blend together and make docs harder to reuse.

Guides lead, Rules enforce, and References inform.

- A Guide MAY refer to Rules and References when a workflow needs shared rules or lookup material.
- A Rule MAY refer to References when enforcement needs supporting facts, tables, options, or examples.
- A Reference MUST NOT carry workflow steps or rules.
- A mixed doc with workflows and enforceable rules SHOULD use a Guide as the entry point and move enforceable material to private Rule files.
- A Rule MAY include structured lookup content when that content states requirements.
- Purely informational lookup content SHOULD live in a Reference.
- A Guide MAY have colocated Rule and Reference files when those files are only needed by that Guide.
- A Rule MAY have colocated Reference files when those files are only needed by that Rule.
- A Reference MUST NOT have colocated child docs because it is the final lookup layer.
- Shared docs SHOULD live at the nearest shared docs level instead of inside one private folder.
- All three kinds MAY each serve as a top-level entry file at `docs/<doc-name>.md`.
- A doc with private support files MUST become a folder named the same as its entry-point file, without the `.md` extension (e.g., `docs/foo-guide/foo-guide.md`).
- Private Rule files MUST live in a `rules/` folder inside the doc folder.
- Private Reference files MUST live in a `references/` folder inside the doc folder.
- New doc file names SHOULD match the document title in kebab-case, including the document kind suffix: `-guide`, `-rule`, or `-reference`.

## Bad

```text
feature-workflow-guide/
├── feature-workflow-guide.md
├── naming-rule.md
└── option-reference.md
```

Why: mixed Markdown files turn the doc folder into an undifferentiated list once the doc grows.

## Good

```text
feature-workflow-guide/
├── feature-workflow-guide.md
├── rules/
│   └── naming-rule.md
└── references/
    └── option-reference.md
```

Why: private support files stay colocated with the entry point while still being grouped by document kind.
