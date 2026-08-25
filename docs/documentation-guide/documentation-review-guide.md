# Documentation Review Guide

This guide explains how to assess and improve repository documentation without adding unnecessary rules or prose. It keeps documents accurate, easy to scan, and consistent with their templates and related documentation.

## How To Assess a Document

Use this workflow before changing an existing document or approving a documentation change.

1. Identify whether the document is a Guide, Rule, Conventions, or Reference with the [Documentation Types Reference](references/documentation-types-reference.md).
2. Read the matching template and its creation rule before judging the document's structure.
3. Check that the overview states the document's scope and purpose in one or two short sentences, without instructions that belong in its body.
4. Check that the document uses only the structure for its type: workflows for a Guide, requirements with paired examples for a Rule, requirements grouped by subject for Conventions, or lookup content for a Reference.
5. Check that each requirement is stated in exactly one Rule or Conventions document, and that no Reference, example, or explanation contradicts or silently changes it.
6. Check that no Reference states a constraint the reader has to satisfy and that no requirement bullet defines a term instead of demanding something.
7. Check that the document is internally consistent: no bullet contradicts another bullet within the same document, and no example violates a MUST NOT in the same document.
8. Check that each example demonstrates exactly the decision it claims to demonstrate, including its stated exceptions.
9. Check that a reader can understand each necessary term from common usage, nearby context, or a definition the documentation provides before the term is used.
10. Check that every rule, condition, exception, and example has a real decision to support that is both necessary and sufficient, removing anything that merely restates an implication, predicts an unlikely edge case, or introduces a term with no further use.
11. Check that the document covers the decisions a reader needs to make, but does not prescribe implementation detail that does not affect those decisions.
12. Check related documents for duplicate, conflicting, outdated, or missing guidance whenever a change affects their shared subject, and verify that dependency chains between documents hold transitively.

## How To Fix Documentation Findings

Use this workflow after identifying an issue during review.

1. Fix the source document and its matching template or rule first when the finding affects more than one document.
2. State each requirement once, in the appropriate Rule or Conventions bullet, with RFC 2119 vocabulary that matches its strength.
3. Move descriptive facts and term definitions to a Reference and workflow actions to a Guide instead of duplicating requirements across document types.
4. Make related documents agree without duplicating their content whenever a short link or a local summary is sufficient.
5. Replace vague or invented terminology with plain, established wording, defining a term only when readers need it to make a decision.
6. Use the same term for the same concept everywhere, and change the term everywhere when its meaning changes.
7. Prefer the smallest wording or structural change that makes the decision complete and unambiguous.
8. Remove redundant bullets, duplicate examples, and exceptions that do not change the reader's decision.
9. Prefer a small complete example over a broad hypothetical one.
10. Update every affected Correct and Incorrect example so it remains valid under the revised guidance.
11. Reassess the changed document and its related documents from the reader's perspective, including headings, links, terminology, and examples; stop when no step finds a new issue.
