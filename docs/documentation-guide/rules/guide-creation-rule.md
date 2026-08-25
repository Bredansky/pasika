# Guide Creation Rule

Guides without a consistent creation process invent their own structure. This rule defines how to create a Guide document.

- Each How To step MUST be concise and use one sentence.
- A Guide MAY link Rules, References, Policy documents, and other Guides.
- A Guide overview MUST contain one or two short descriptive sentences about the guide's scope and purpose, and MUST NOT contain instructions or links to other documentation.
- Each How To step MUST link at most one documentation file total, whatever kind that file is.
- When a step links another document, the step MUST name the concrete decision or result the reader will have after reading it.
- A step that links another Guide MUST link directly to the relevant How To section.
- How To sections MUST NOT nest inside other How To sections.
- Guide file names MUST match the document title in kebab-case and use the `-guide` suffix (e.g., `foo-guide.md`).
- A Guide with support files MUST become a folder named the same as its entry-point file, without the `.md` extension.
- A Rule file that a Guide owns MUST live in a `rules/` subfolder inside the Guide's folder.
- A Reference file that a Guide owns MUST live in a `references/` subfolder inside the Guide's folder.
- A Guide whose steps use terms that a glossary Reference defines MUST link that Reference from its first step.

## Incorrect — Support Documents Mixed at the Guide Root

```text
feature-workflow-guide/
├── feature-workflow-guide.md
├── naming-rule.md
└── option-reference.md
```

Why: mixed Markdown files turn the doc folder into an undifferentiated list once the doc grows.

## Correct — Support Documents Grouped by Kind

```text
feature-workflow-guide/
├── feature-workflow-guide.md
├── rules/
│   └── naming-rule.md
└── references/
    └── option-reference.md
```

Why: support files stay colocated with the entry point while being grouped by document kind.

## Incorrect — Step Links to Multiple Documents

```markdown
1. Follow the [Naming Rule](rules/naming-rule.md) and the [Layout Rule](rules/layout-rule.md) so the doc looks right.
```

Why: step links two Rules and does not name a concrete decision or result.

## Correct — Step Links to One Document

```markdown
1. Follow the [Naming Rule](rules/naming-rule.md) so the doc has a predictable file name.
```

Why: step links one Rule and names the concrete result the reader will have.

## Incorrect — Nested How To Section

```markdown
## How To Deploy

1. Build the project.
   ### How To Build
   1. Run the build script.
```

Why: a How To section nests inside a step of another How To section.

## Correct — Flat How To Sections

```markdown
## How To Deploy

1. Follow [How To Build](#how-to-build) to build the project.

## How To Build

1. Run the build script.
```

Why: How To sections stay flat and reference each other via links.

## Incorrect — Multi-Sentence Step

```markdown
1. First, check the configuration file. Then verify all required fields are present. After that, confirm none of the fields contain invalid values.
```

Why: step uses multiple sentences instead of one concise sentence.

## Correct — Concise Step

```markdown
1. Run the config check script.
```

Why: step is one concise sentence with a concrete action.

## Incorrect — Guide Link Omits Its How To Section

```markdown
1. Follow the [Build Guide](build-guide.md) to build the project.
```

Why: link points at a Guide file but does not anchor to a specific How To section, so the reader lands on the guide's introduction and has to search for the relevant workflow.

## Correct — Guide Link Targets Its How To Section

```markdown
1. Follow [How To Build](build-guide.md#how-to-build) to build the project.
```

Why: link anchors to the specific How To section, so the reader lands directly on the relevant workflow.

## Incorrect — Guide Uses Defined Terms Without Linking the Glossary

```markdown
## How To Organize a Component

1. Pick the component's placement per the [Component Placement Rule](rules/component-placement-rule.md).
2. Classify the component as smart or dumb per the [Smart vs Dumb Component Rule](rules/smart-vs-dumb-component-rule.md).
```

Why: the steps ask the reader to classify a component and to place it by its closest common folder, but nothing tells the reader where those terms are defined.

## Correct — First Step Links the Glossary

```markdown
## How To Organize a Component

1. Read the [Glossary Reference](references/glossary-reference.md) to learn the terms these steps use.
2. Pick the component's placement per the [Component Placement Rule](rules/component-placement-rule.md).
3. Classify the component as smart or dumb per the [Smart vs Dumb Component Rule](rules/smart-vs-dumb-component-rule.md).
```

Why: the first step points at the one document that defines the terms, so the reader can resolve them before making any decision.
