# Glossary Reference

Use this reference to look up the terms this guide's workflows use for the framework's documentation distribution as it appears inside a consuming repository.

| Term         | Definition                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| Tracked doc  | A document a repository consumes from a pinned remote source rather than authoring itself.                        |
| Managed file | A file Vulyk installed or generated, listed in the `.vulyk` manifest of the folder that holds it.                 |
| Agent file   | A generated `AGENTS.md` or `CLAUDE.md` that routes an agent to the tracked docs applying to its folder.           |
| Inline entry | A tracked doc whose full body is written into the generated agent file instead of being summarized with a link.   |
