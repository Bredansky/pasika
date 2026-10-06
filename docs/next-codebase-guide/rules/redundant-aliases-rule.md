# Redundant Aliases Rule

Aliases make one value appear under multiple names and can hide naming drift between data contracts, while ordinary local object shaping is not a contract mapping. A direct data-contract field mapping can qualify a field with its source object's name, and other renames should occur only where typed ownership proves a real external or platform boundary.

- A `const` variable MUST NOT introduce a new name for another variable or object property, unless Next.js requires a specific exported name.
- An import MUST NOT rename an imported symbol.
- An export specifier MUST NOT introduce a second name for a symbol unless a framework requires the exported name.
- Destructuring MUST keep property names unchanged.
- When an object uses an existing variable as a property value, the property MUST use the same name and shorthand form.
- A direct data-contract field mapping whose names are not convention-equivalent MUST map to or from a contract controlled by an external service, third-party package, or runtime platform.
- Mappings between data contracts controlled by this repository MUST preserve one canonical field name.
- A direct field mapping MAY qualify the source field name with the source object's name.
- It MUST be possible to determine who controls both sides of a renamed contract field.
- Properties stored in variables MUST use object destructuring. Properties from the same object MUST be destructured together in one declaration.
- A type alias that directly names one non-generic type or primitive type MUST NOT introduce a second name for that type.
- An empty interface that extends exactly one non-generic type MUST NOT introduce a second name for that type.

## Incorrect — Redundant Local Aliases

```ts
const ApiClient = PlatformClient;
import { Toaster as Sonner } from "sonner";
export { defaultSliderMin as TEXT_SIZE_SLIDER_MIN };

const appKey = credentials.apiKey;
const method = HttpMethod.Post;
const { apiSecret: appSecret } = credentials;
const { x: left } = layer.position;

const previewUrl = file.previewUrl;
const width = layer.position.width;
const height = layer.position.height;

type ApiCredential = PlatformCredentialApi;
type FlagKeys = string;

interface ApiResponse extends PlatformResponse {}
```

Why: aliases such as `appKey`, `appSecret`, and `left` give an existing value another name. Same-name property reads such as `file.previewUrl` use destructuring, and properties read from the same object are destructured together.

## Correct — Original Local Names

```ts
import { Toaster } from "sonner";
export { defaultSliderMin };

// app/api/example/route.ts
export { handler as GET, handler as POST } from "./handler";

const { previewUrl, type } = file;
const { x, width, height, zIndex } = layer.position;

const data = await loadResults();
const resultPayload = { data };

type BrandedIdentifier = string & {
  readonly __brand: unique symbol;
};

type ApiCredential = PlatformCredentialApi & {
  source: "api";
};

interface ApiResponse extends PlatformResponse {
  receivedAt: Date;
}
```

Why: bindings keep the names provided by their source, object values use shorthand when the property name matches, and framework-required export names remain allowed. A type or interface that adds structure is not only another name for the original type.

## Incorrect — Renamed Repository Contract Field

```ts
const rawCredentialsSchema = z.object({
  accessTokenSecret: z.string(),
});

type RawCredentials = z.infer<typeof rawCredentialsSchema>;

interface Credentials {
  accessSecret: string;
}

function credentialsOf(rawCredentials: RawCredentials): Credentials {
  return {
    accessSecret: rawCredentials.accessTokenSecret,
  };
}
```

Why: both contracts are controlled by this repository, but the same value is called `accessTokenSecret` in one contract and `accessSecret` in the other.

## Correct — Canonical Or Deterministic Contract Fields

```ts
const credentialsSchema = z.object({
  accessTokenSecret: z.string(),
});

type Credentials = z.infer<typeof credentialsSchema>;

const apiCredential: ApiCredential = {
  userAccountId: row.user_account_id,
  createdAt: row.created_at,
};

const mediaLayer: MediaLayer = {
  fileId: file.id,
  fileType: file.type,
};
```

Why: when two repository-owned contracts would describe the same values with the same shape and semantics, one canonical contract is used instead of mapping between duplicates. Naming-convention translations ignore case and separators, so `user_account_id` and `userAccountId` are equivalent. `fileId: file.id` and `fileType: file.type` deterministically qualify the source field with the source object name instead of assigning an unrelated semantic name.

## Incorrect — Unknown Contract Ownership

```ts
const externalFileSchema = z.object({
  file_id: z.string(),
});

type ExternalFile = z.infer<typeof externalFileSchema>;

function untypedFile(raw: ExternalFile) {
  return {
    id: raw.file_id,
  };
}
```

Why: the source has a data contract, but the returned object has no concrete target contract, so there is not enough information to determine who controls both sides of the rename.

## Correct — Proven External Contract Ownership

```ts
const externalFileSchema = z.object({
  file_id: z.string(),
});

defineApiContract({
  method: HttpMethod.Get,
  path: "https://api.example.com/files",
  responseSchema: externalFileSchema,
});

type ExternalFile = z.infer<typeof externalFileSchema>;

interface FileModel {
  id: string;
}

function fileOf(raw: ExternalFile): FileModel {
  return {
    id: raw.file_id,
  };
}
```

Why: the absolute external API contract proves that `file_id` is controlled outside this repository, while `FileModel.id` is controlled here. The mapping is therefore an adapter between contracts with known ownership rather than unexplained internal naming drift.
