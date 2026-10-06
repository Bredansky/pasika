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

## Incorrect — Internal Drift Or Missing Contract Ownership

```ts
const ApiClient = PlatformClient;
import { Toaster as Sonner } from "sonner";
export { defaultSliderMin as TEXT_SIZE_SLIDER_MIN };

const appKey = credentials.apiKey;
const method = HttpMethod.Post;
const { apiSecret: appSecret } = credentials;
const { x: left } = layer.position;

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

const externalFileSchema = z.object({
  file_id: z.string(),
});

type ExternalFile = z.infer<typeof externalFileSchema>;

function untypedFile(raw: ExternalFile) {
  return {
    id: raw.file_id,
  };
}

const previewUrl = file.previewUrl;
const width = layer.position.width;
const height = layer.position.height;

type ApiCredential = PlatformCredentialApi;
type FlagKeys = string;

interface ApiResponse extends PlatformResponse {}
```

Why: aliases such as `appKey`, `appSecret`, and `left` give an existing value another name. The credential mapping renames a field from a repository-owned Zod data contract into another repository-owned contract, while the inferred file result provides no target contract whose ownership can be established. Same-name property reads such as `file.previewUrl` should use destructuring, and properties read from the same object should be destructured together.

## Correct — Canonical Names, Qualified Fields, And External Boundaries

```ts
import { Toaster } from "sonner";
export { defaultSliderMin };

// app/api/example/route.ts
export { handler as GET, handler as POST } from "./handler";

const { previewUrl, type } = file;
const { x, width, height, zIndex } = layer.position;

const data = await loadResults();
const resultPayload = { data };

const apiCredential: ApiCredential = {
  userAccountId: row.user_account_id,
  createdAt: row.created_at,
};

const mediaLayer: MediaLayer = {
  id: layerId,
  type: "media",
  fileId: file.id,
  fileType: file.type,
};

new TwitterApi({
  appKey: credentials.apiKey,
  appSecret: credentials.apiSecret,
  accessToken: credentials.accessToken,
  accessSecret: credentials.accessSecret,
});

const telegramRequestSchema = z.object({
  chat_id: z.string(),
  caption: z.string().optional(),
});

defineApiContract({
  method: HttpMethod.Post,
  path: "https://api.telegram.org/bot{token}/sendPhoto",
  requestSchema: telegramRequestSchema,
  responseSchema: telegramResponseSchema,
});

function telegramRequest(payload: EditorPayload): z.infer<typeof telegramRequestSchema> {
  return {
    chat_id: payload.chatId,
    caption: payload.text,
  };
}

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

Why: bindings keep the names provided by their source. Naming-convention translations compare field names case-insensitively while ignoring separators, so `user_account_id` maps directly to `userAccountId`. `fileId: file.id` and `fileType: file.type` qualify the source fields with the source object name `file` instead of giving them unrelated semantic names. Pasika treats Zod fields and repository-owned generated database fields as data-contract evidence; ordinary local object shaping and Zod schema composition are not data-field mappings. The Twitter constructor exposes a third-party contextual type, and the Telegram wire schema is tied to an absolute external API contract, so those mappings have proven external ownership. Internal data contracts use one canonical field name, and mappings without enough contract information are completed instead of being guessed from surrounding sibling fields. Framework-required export names remain allowed.
