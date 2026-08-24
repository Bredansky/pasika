# Documentation Review Guide

This guide explains how to assess and improve repository documentation without adding unnecessary rules or prose. It keeps documents accurate, easy to scan, and consistent with their templates and related documentation.

## How To Assess a Document

Use this workflow before changing an existing document or approving a documentation change.

1. Identify whether the document is a Guide, Rule, or Reference with the [Documentation Types Reference](managed/documentation-guide/references/documentation-types-reference.md).
2. Read the matching template and its creation rule before judging the document's structure.
3. Check that the overview states the document's scope and purpose in one or two short sentences, without instructions that belong in its body.
4. Check that the document uses only the structure for its type: workflows for a Guide, requirements and paired examples for a Rule, or lookup content for a Reference.
5. Check that each requirement is stated in exactly one Rule and that no Reference, example, or explanation contradicts or silently changes it.
6. Check that the document is internally consistent: no bullet contradicts another bullet within the same document, and no example violates a MUST NOT in the same document.
7. Check that each example demonstrates exactly the decision it claims to demonstrate, including its stated exceptions.
8. Check that a reader can understand each necessary term from common usage, nearby context, a definition, or the framework documentation before the term is used.
9. Check that every rule, condition, exception, and example has a real decision to support that is both necessary and sufficient, removing anything that merely restates an implication, predicts an unlikely edge case, or introduces a term with no further use.
10. Check that the document covers the decisions a reader needs to make, but does not prescribe implementation detail that does not affect those decisions.
11. Check that this guide itself passes every step in this workflow.
12. Check related documents for duplicate, conflicting, outdated, or missing guidance whenever a change affects their shared subject, and verify that dependency chains between documents hold transitively.

## How To Fix Documentation Findings

Use this workflow after identifying an issue during review.

1. Fix the source document and its matching template or rule first when the finding affects more than one document.
2. State each requirement once, in the appropriate Rule bullet, with RFC 2119 vocabulary that matches its strength.
3. Move descriptive facts to a Reference and workflow actions to a Guide instead of duplicating requirements across document types, making related documents agree without duplicating their content when a short link or a local summary is sufficient.
4. Replace vague or invented terminology with plain, established wording; define a term only when readers need it to make a decision. Use the same term for the same concept everywhere and change the term everywhere when its meaning changes.
5. Prefer the smallest wording or structural change that makes the decision complete and unambiguous.
6. Remove redundant bullets, duplicate examples, and exceptions that do not change the reader's decision. Prefer a small complete example over a broad hypothetical one.
7. Update every affected Correct and Incorrect example so it remains valid under the revised guidance.
8. Reassess the changed document and its related documents from the reader's perspective, including headings, links, terminology, and examples; stop when no step finds a new issue.
