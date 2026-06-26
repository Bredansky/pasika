# Documentation Guide

- A single source of truth for how Markdown documentation is structured in this repository.
- It matters because predictable shape saves readers and agents from re-learning each doc.

## How To Create A Document

Run this whenever you add a new doc to the repository.

1. Pick the document kind from the [Documentation Types Reference](references/documentation-types-reference.md) so the right template is known.
2. Start from the linked template for the picked kind, then replace every bracketed prompt and delete unused branches according to the [Template Usage Rule](rules/template-usage-rule.md) so the new doc has the expected shape and commits with no leftover bracket prompts.
3. Decide whether the doc is standalone or needs private support files, then place it according to the [Documentation Direction Rule](rules/documentation-direction-rule.md) so the doc and any private support files follow the documented dependency direction and folder layout.
4. If the new document is a Rule, apply the [Rule Vocabulary Rule](rules/rule-vocabulary-rule.md) in its rule body so the rule uses RFC 2119 vocabulary with the canonical meaning for each keyword.
