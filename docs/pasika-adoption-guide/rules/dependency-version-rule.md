# Dependency Version Rule

Version ranges let installs drift silently between releases. This rule requires every declared dependency to pin an exact version and to stay within one major version of the latest release.

- A dependency or devDependency in package.json MUST pin an exact version, never a range.
- A repository MUST keep every dependency in package.json within one major version of the latest release.

## Incorrect — Range Specifiers

```json
{
  "devDependencies": {
    "eslint": "^10.9.1",
    "typescript": "~5.9.2"
  }
}
```

Why: `^` and `~` permit invisible minor and patch bumps, so two installs of the same manifest can resolve different dependency graphs.

## Correct — Exact Specifiers

```json
{
  "devDependencies": {
    "eslint": "10.9.1",
    "typescript": "5.9.3"
  }
}
```

Why: the bare versions make every install reproducible, and the pre-commit drift check (`npx libyear --limit-major-individual=1`) fails while a dependency trails the latest release by more than one major version.
