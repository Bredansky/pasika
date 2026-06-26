# Documentation Guide

- A single source of truth for how Markdown documentation is structured in this repository.
- It matters because predictable shape saves readers and agents from re-learning each doc.

## How To Create A Document

Run this whenever you add a new doc to the repository.

1. Pick the document kind from the [Documentation Types Reference](references/documentation-types-reference.md) so the right template is known.
2. Start from the linked template, replace every bracketed prompt, and delete unused branches according to the [Template Usage Rule](rules/template-usage-rule.md) so the doc has the expected shape with no leftover brackets.
3. Decide whether the doc is standalone or has private support files, then place it according to the [Documentation Direction Rule](rules/documentation-direction-rule.md) so placement follows the documented direction and folder layout.
4. If the new document is a Rule, apply the [Rule Vocabulary Rule](rules/rule-vocabulary-rule.md) to its rule body so RFC 2119 keywords are used with their canonical meanings.
