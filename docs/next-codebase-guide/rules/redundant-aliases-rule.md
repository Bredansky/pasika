# Redundant Aliases Rule

Aliases that only give an existing symbol a second name hide incomplete renames and increase cognitive load. This rule keeps one canonical name unless a declaration changes or composes the underlying value or type.

- A variable declaration whose initializer is another symbol identifier MUST NOT introduce a second name for that symbol.
- A type alias that directly names one non-generic type MUST NOT introduce a second name for that type.
- An empty interface that extends exactly one non-generic type MUST NOT introduce a second name for that type.

## Incorrect — Declarations Only Rename Existing Symbols

```ts
const ApiClient = PlatformClient;

type ApiCredential = PlatformCredentialApi;

interface ApiResponse extends PlatformResponse {}
```

Why: each declaration creates a second name without changing the value or type it refers to.

## Correct — Declarations Add Meaning Instead of a Synonym

```ts
const defaultStatus = ResponseStatus.Pending;
const config = app.config;

type ApiCredential = PlatformCredentialApi & {
  source: "api";
};

interface ApiResponse extends PlatformResponse {
  receivedAt: Date;
}
```

Why: member access extracts a distinct value, while the type and interface declarations add structure instead of merely renaming an existing symbol.
