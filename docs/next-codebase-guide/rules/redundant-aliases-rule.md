# Redundant Aliases Rule

Aliases that only give an existing symbol or primitive type a second name hide incomplete renames and increase cognitive load. This rule keeps one canonical name unless a declaration changes or composes the underlying value or type.

- A `const` variable declaration whose initializer is another symbol identifier MUST NOT introduce a second name for that symbol unless Next.js requires a specific exported name.
- An export specifier MUST NOT introduce a second name for a symbol unless a framework requires the exported name.
- An object property MUST NOT rename a local value, and a member expression MUST NOT be mapped inline when it can be bound to the property name first.
- A local variable derived directly from an object property MUST use object destructuring. Adjacent selections from the same source MUST use one object destructuring declaration rather than repeated declarations.
- A type alias that directly names one non-generic type or primitive type MUST NOT introduce a second name for that type.
- An empty interface that extends exactly one non-generic type MUST NOT introduce a second name for that type.

## Incorrect — Declarations Only Rename Existing Symbols or Primitive Types

```ts
const ApiClient = PlatformClient;
export { defaultSliderMin as TEXT_SIZE_SLIDER_MIN };
return { data: results };
new TwitterApi({ appKey: credentials.apiKey });
const previewUrl = file.previewUrl;
const fileType = file.type;
const { accessTokenSecret } = rawCredentials;
if (!accessTokenSecret) throw new Error();
return { accessSecret: accessTokenSecret };
const { x: left } = layer.position;
const { width } = layer.position;
const { height } = layer.position;
const { zIndex } = layer.position;

type ApiCredential = PlatformCredentialApi;
type FlagKeys = string;

interface ApiResponse extends PlatformResponse {}
```

Why: declarations create unnecessary synonyms, inline object mappings make one expression carry both value selection and naming, and direct property reads repeat their source instead of expressing selection in the binding. Rename the producer when possible, bind member expressions before object assembly, and destructure direct property reads.

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

const { previewUrl, type: fileType } = file;
const { accessTokenSecret } = rawCredentials;
if (!accessTokenSecret) throw new Error();
return { accessTokenSecret };
const { x: left, width, height, zIndex } = layer.position;

const position = createPositionSchema();
z.object({ position });
z.object({ position });

defineApiContract({ method: HttpMethod.Post });

type ApiCredential = PlatformCredentialApi & {
  source: "api";
};

interface ApiResponse extends PlatformResponse {
  receivedAt: Date;
}
```

Why: a local value keeps one canonical name across object consumers, while direct property reads use destructuring at the binding site. Multiple adjacent selections from one source are expressed by one destructuring declaration. Imported/static members may be mapped directly because there is no local producer to rename. Mutable variables may diverge from their initial value, and the type and interface declarations add structure instead of merely renaming an existing symbol. Next.js-required exported names are also allowed.
