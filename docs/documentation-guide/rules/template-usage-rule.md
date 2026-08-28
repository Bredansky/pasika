# Template Usage Rule

Authoring without a template makes every doc invent its own title, orientation, and section shape. This rule keeps new docs predictable by starting every one of them from the templates in `../_templates/`.

- Authors MUST start from the template that matches the chosen document kind and structure.
- Authors MUST replace each bracketed prompt with the final title, explanation, step, or lookup content it asks for.
- Authors MUST delete sections that do not apply to the document being written.
- Documentation support assets MAY live in folders whose names start with an underscore.

## Incorrect — Template Prompts and Unused Sections Kept

```markdown
# Example Guide

[1-2 short sentences explaining the underlying idea behind this guide and why it matters.]

## How To Do Something

[What does this accomplish? When should it run?]

1. [Step 1]
2. [Step 2]

## How To Another Workflow

[What does this accomplish? When should it run?]

1. [Step 1]
2. [Step 2]
```

Why: committed doc still contains bracketed prompts, and the unused "Another Workflow" section was not deleted.

## Correct — Template Prompts Replaced and Unused Sections Removed

```markdown
# Example Guide

This guide shows how to do something useful. It matters because doing it wrong breaks the build.

## How To Do Something

Run this before every release.

1. Check the config.
2. Run the deploy script.
```

Why: all bracketed prompts are replaced, unused sections are deleted, and no leftover brackets remain.
