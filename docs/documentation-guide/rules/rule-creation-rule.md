# Rule Creation Rule

Rules without a consistent creation process invent their own structure and enforcement language. This rule defines how to create a Rule document.

- Rule file names MUST match the document title in kebab-case and use the `-rule` suffix (e.g., `foo-rule.md`).
- A Rule overview MUST contain one or two short sentences naming the problem the rule solves.
- A Rule MUST state requirements about one subject.
- A Rule MUST contain at least one bullet point that uses [RFC 2119 vocabulary](https://datatracker.ietf.org/doc/html/rfc2119) (`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`).
- RFC 2119 vocabulary MUST appear only in bullet points, so the bullet list is the single place a requirement is stated.
- A bullet MUST use `MUST` or `MUST NOT` only when the requirement admits no exception, `SHOULD` or `SHOULD NOT` only when exceptions are possible, and `MAY` only when the behavior is optional.
- Prose outside bullet points — intros, `Why:` explanations, table cells, and code comments — MUST restate a requirement in plain language instead of repeating RFC 2119 vocabulary.
- A bullet MUST NOT define a term, and a term a reader needs in order to apply the Rule MUST be defined in a Reference instead.
- A Rule MUST contain at least one Incorrect/Correct pair.
- A Rule MAY contain multiple Incorrect/Correct pairs.
- An Incorrect/Correct pair MUST add a concise description after an em dash in both headings, so readers can scan the examples by decision.
- A Rule MUST NOT link to References, Guides, or other Rules.

## Incorrect — Lowercase Requirement Words

```markdown
- Authors must remove unused sections.
- New docs should use the -rule suffix.
```

Why: lower-case "must" and "should" do not carry RFC 2119 meaning.

## Correct — RFC 2119 Requirement Words

```markdown
- Authors MUST remove unused sections.
- New docs SHOULD use the -rule suffix.
```

Why: uppercase keywords carry their canonical RFC 2119 meaning.

## Incorrect — Rule Links to a Reference

```markdown
- Rule bodies MUST follow the guidance in the [Vocabulary Reference](../references/vocabulary-reference.md).
```

Why: rule contains a reference to another Reference.

## Correct — Rule States Its Vocabulary Directly

```markdown
- Rule bodies MUST use RFC 2119 vocabulary: MUST, MUST NOT, SHOULD, SHOULD NOT, or MAY.
```

Why: rule states requirements directly without referencing other docs.

## Incorrect — Bullet Defines a Term

```markdown
- A smart component MUST fetch data or pass `on*` callbacks to children.
- A smart component file name MUST be `PascalCase.tsx`.
```

Why: the first bullet describes what makes a component smart rather than asking for anything, so a reader who does not fetch data appears to be violating a requirement by writing a dumb component.

## Correct — Term Defined in a Reference

```markdown
- A smart component file name MUST be `PascalCase.tsx`.
```

Why: the classification lives in the glossary, so every bullet in the Rule asks the reader for something.

## Incorrect — Requirement Repeated in an Explanation

```markdown
- A helper file MUST use named exports.

## Incorrect — Default Export

// helper.ts
export default function sum(a, b) {}

Why: a helper file MUST use named exports, so `export default` is not allowed here.
```

Why: the explanation repeats the bullet's requirement word, so the requirement now lives in two places and a later edit can leave the bullet and the explanation disagreeing about what is required.

## Correct — Requirement Explained in Plain Language

```markdown
- A helper file MUST use named exports.

## Incorrect — Default Export

// helper.ts
export default function sum(a, b) {}

Why: helper files use named exports only, so `export default` does not belong here.
```

Why: the bullet is the only place the requirement is stated, and the explanation describes the example in plain language.
