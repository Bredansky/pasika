# Upstream Performance Adoption Rule

External React performance recommendations may require context that a static linter cannot establish. This rule separates Vulyk-managed upstream material from requirements deliberately adopted by Pasika.

- Imported upstream performance recommendations MUST remain advisory until an equivalent requirement is approved in a Pasika Rule.
- An adopted performance requirement MUST be classified through the existing requirements registry before an ESLint rule enforces it.
- An ESLint implementation for an adopted performance requirement SHOULD be limited to statically verifiable cases and supported by regression tests.

## Incorrect — Automatic ESLint Enforcement After Upstream Sync

```sh
npx vulyk update vercel-react-best-practices
npx vulyk sync
# Treat every changed upstream recommendation as a new mandatory ESLint error.
```

Why: synchronizing reference material is not a decision to change Pasika's policy, and context-sensitive advice can create false positives.

## Correct — Review and Classify Local Requirements

```sh
npx vulyk diff vercel-react-best-practices
npx vulyk update vercel-react-best-practices
npx vulyk sync
# Review the changes; adopt only selected recommendations in Pasika docs.
# Use the existing scripts/registry.json classification workflow for adopted requirements.
npm run test:requirements
```

Why: reviewers retain control of normative rules while the existing registry and tests track any accepted enforcement.
