# Redundant Aliases Rule

Aliases that only give an existing symbol or primitive type a second name hide incomplete renames and increase cognitive load. This rule keeps one canonical name unless a declaration changes or composes the underlying value or type.

- A `const` variable declaration whose initializer is another symbol identifier MUST NOT introduce a second name for that symbol unless Next.js requires a specific exported name.
- An export specifier MUST NOT introduce a second name for a symbol unless a framework requires the exported name.
- An object property MUST NOT rename or derive a value inline when the property can use a named local instead.
- A type alias that directly names one non-generic type or primitive type MUST NOT introduce a second name for that type.
- An empty interface that extends exactly one non-generic type MUST NOT introduce a second name for that type.

## Incorrect — Declarations Only Rename Existing Symbols or Primitive Types

```ts
const ApiClient = PlatformClient;
export { defaultSliderMin as TEXT_SIZE_SLIDER_MIN };
return { data: results };
new TwitterApi({ appKey: credentials.apiKey });

type ApiCredential = PlatformCredentialApi;
type FlagKeys = string;

interface ApiResponse extends PlatformResponse {}
```

Why: declarations create unnecessary synonyms, while inline object mappings make one expression carry both value selection and naming. Rename the producer when possible, or bind a member expression once, then use shorthand.

## Correct — Declarations Add Meaning Instead of a Synonym

```ts
const defaultStatus = ResponseStatus.Pending;
const config = app.config;
let currentSize = initialSize;
export { defaultSliderMin };
const data = await loadResults();
return { data };

const appKey = credentials.apiKey;
new TwitterApi({ appKey });

const positionSchema = createPositionSchema();
z.object({ position: positionSchema });
z.object({ position: positionSchema });

defineApiContract({ method: HttpMethod.Post });

const platformType = input.platformType;
const row = { platform_type: platformType };
const wirePayload = { creation_id: response.id };

type ApiCredential = PlatformCredentialApi & {
  source: "api";
};

interface ApiResponse extends PlatformResponse {
  receivedAt: Date;
}
```

Why: values that need a property name are named before object construction when a local producer can safely adopt that name. Reusable or exported symbols keep their canonical names, imported/static members may be mapped directly because there is no local producer to rename, and external wire keys such as `platform_type` or `creation_id` stay mapped because those names are not valid project-local names. A mapping also stays inline when its target name is already bound in scope. Mutable variables may diverge from their initial value, and the type and interface declarations add structure instead of merely renaming an existing symbol. Next.js-required exported names are also allowed.
