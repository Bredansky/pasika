# Rule Creation Rule

Rules without a consistent creation process invent their own structure and enforcement language. This rule defines how to create a Rule document.

- Rule file names MUST match the document title in kebab-case and use the `-rule` suffix (e.g., `foo-rule.md`).
- A Rule MUST contain at least one bullet point that uses [RFC 2119 vocabulary](https://datatracker.ietf.org/doc/html/rfc2119) (`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`).
- RFC 2119 vocabulary MUST appear only in bullet points, so the bullet list is the single place a requirement is stated.
- Prose outside bullet points — intros, `Why:` explanations, table cells, and code comments — MUST restate a requirement in plain language instead of repeating RFC 2119 vocabulary.
- `MUST` MUST mean required.
- `MUST NOT` MUST mean forbidden.
- `SHOULD` MUST mean recommended, with exceptions possible.
- `SHOULD NOT` MUST mean discouraged, with exceptions possible.
- `MAY` MUST mean optional.
- A Rule MUST contain at least one Incorrect/Correct pair.
- A Rule MAY contain multiple Incorrect/Correct pairs.
- A Rule MUST NOT link to References, Guides, or other Rules.

## Incorrect

```markdown
- Authors must remove unused sections.
- New docs should use the -rule suffix.
```

Why: lower-case "must" and "should" do not carry RFC 2119 meaning.

## Correct

```markdown
- Authors MUST remove unused sections.
- New docs SHOULD use the -rule suffix.
```

Why: uppercase keywords carry their canonical RFC 2119 meaning.

## Incorrect

```markdown
- Rule bodies MUST follow the guidance in the [Vocabulary Reference](../references/vocabulary-reference.md).
```

Why: rule contains a reference to another Reference.

## Correct

```markdown
- Rule bodies MUST use RFC 2119 vocabulary: MUST, MUST NOT, SHOULD, SHOULD NOT, or MAY.
```

Why: rule states requirements directly without referencing other docs.

## Incorrect

```markdown
- A helper file MUST use named exports.

## Incorrect

// helper.ts
export default function sum(a, b) {}

Why: a helper file MUST use named exports, so `export default` is not allowed here.
```

Why: the explanation repeats the bullet's requirement word, so the requirement now lives in two places and a later edit can leave the bullet and the explanation disagreeing about what is required.

## Correct

```markdown
- A helper file MUST use named exports.

## Incorrect

// helper.ts
export default function sum(a, b) {}

Why: helper files use named exports only, so `export default` does not belong here.
```

Why: the bullet is the only place the requirement is stated, and the explanation describes the example in plain language.
