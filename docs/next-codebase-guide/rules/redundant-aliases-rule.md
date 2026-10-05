# Redundant Aliases Rule

Aliases make one value appear under multiple names and can hide naming mismatches between models. Keep source names when creating bindings, and show genuine name differences only where one object or contract is mapped into another.

- A `const` variable MUST NOT introduce a new name for another variable or object property, unless Next.js requires a specific exported name.
- An import MUST NOT rename an imported symbol.
- An export specifier MUST NOT introduce a second name for a symbol unless a framework requires the exported name.
- Destructuring MUST keep property names unchanged. When an object uses an existing variable, the property MUST have the same name and use shorthand. When mapping one object to another, a property MAY use a different name if the value is read directly from the source object.
- Properties stored in variables MUST use object destructuring. Properties from the same object MUST be destructured together in one declaration.
- A type alias that directly names one non-generic type or primitive type MUST NOT introduce a second name for that type.
- An empty interface that extends exactly one non-generic type MUST NOT introduce a second name for that type.

## Incorrect — Hidden Aliases and Scattered Reads

```ts
const ApiClient = PlatformClient;
import { Toaster as Sonner } from "sonner";
export { defaultSliderMin as TEXT_SIZE_SLIDER_MIN };

const appKey = credentials.apiKey;
const method = HttpMethod.Post;
const { apiSecret: appSecret } = credentials;
const { x: left } = layer.position;

const { accessTokenSecret } = credentials;
const twitterCredentials = { accessSecret: accessTokenSecret };

const previewUrl = file.previewUrl;
const width = layer.position.width;
const height = layer.position.height;

type ApiCredential = PlatformCredentialApi;
type FlagKeys = string;

interface ApiResponse extends PlatformResponse {}
```

Why: aliases such as `appKey`, `appSecret`, and `left` give an existing value another name. Mapping `accessTokenSecret` only after it has been detached from `credentials` hides which model the value came from. Same-name property reads such as `file.previewUrl` should use destructuring, and properties read from the same object should be destructured together.

## Correct — Preserve Names and Map at Boundaries

```ts
import { Toaster } from "sonner";
export { defaultSliderMin };

// app/api/example/route.ts
export { handler as GET, handler as POST } from "./handler";

const { previewUrl, type } = file;
const { x, width, height, zIndex } = layer.position;

const data = await loadResults();
const resultPayload = { data };

new TwitterApi({
  appKey: credentials.apiKey,
  appSecret: credentials.apiSecret,
  accessToken: credentials.accessToken,
  accessSecret: credentials.accessTokenSecret,
});

const apiCredential = {
  userAccountId: row.user_account_id,
  createdAt: row.created_at,
};

defineApiContract({ method: HttpMethod.Post });
const pendingResponse = { status: ResponseStatus.Pending };

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

Why: bindings keep the names provided by their source. When the target model genuinely uses another name, the object mapping shows both names and keeps the source qualified, such as `appKey: credentials.apiKey` or `userAccountId: row.user_account_id`. Same-name properties are destructured once and reused without aliases, object properties use shorthand for existing locals, and type or interface declarations add structure instead of only renaming an existing type. Framework-required export names remain allowed.
