# Template Usage Rule

Authoring without a template makes every doc invent its own title, orientation, and section shape. This rule keeps new docs predictable. Templates for each document kind live in `../_templates/`.

- Authors MUST start from the template for the chosen document kind.
- Authors MUST replace each bracketed prompt with the final title, explanation, step, or lookup content it asks for.
- Authors MUST delete template branches that do not apply to the document being written.

## Incorrect

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

## Correct

```markdown
# Example Guide

This guide shows how to do something useful. It matters because doing it wrong breaks the build.

## How To Do Something

Run this before every release.

1. Check the config.
2. Run the deploy script.
```

Why: all bracketed prompts are replaced, unused template branches are deleted, and no leftover brackets remain.
