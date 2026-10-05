# Redundant Aliases Rule

Aliases hide naming inconsistencies by giving the same value different local names. Keep a value's original name when creating a binding, make name changes visible only where one object or contract is mapped into another, and treat enum/static members as constants rather than runtime-model fields.

- A `const` variable MUST NOT introduce a new name for another variable or object property, unless Next.js requires a specific exported name.
- An import MUST NOT rename an imported symbol.
- An export specifier MUST NOT introduce a second name for a symbol unless a framework requires the exported name.
- Destructuring MUST keep property names unchanged. When an object uses an existing variable, the property MUST have the same name and use shorthand. A property MAY use a different name when it reads directly from another object.
- Properties stored in variables MUST use object destructuring. Properties from the same object MUST be destructured together in one declaration.
- A type alias that directly names one non-generic type or primitive type MUST NOT introduce a second name for that type.
- An empty interface that extends exactly one non-generic type MUST NOT introduce a second name for that type.

## Incorrect — Renames Hidden in Bindings

```ts
const ApiClient = PlatformClient;
import { Toaster as Sonner } from "sonner";
export { defaultSliderMin as TEXT_SIZE_SLIDER_MIN };

const appKey = credentials.apiKey;
const { apiSecret: appSecret } = credentials;
const { x: left } = layer.position;

const { accessTokenSecret } = credentials;
return { accessSecret: accessTokenSecret };

const previewUrl = file.previewUrl;
const width = layer.position.width;
const height = layer.position.height;

type ApiCredential = PlatformCredentialApi;
type FlagKeys = string;

interface ApiResponse extends PlatformResponse {}
```

Why: these forms create another local name for an existing value or hide a name change behind a local variable. A name change between models should stay visible at the object boundary instead.

## Correct — Same-Name Bindings and Explicit Mappings

```ts
const defaultStatus = ResponseStatus.Pending;
const config = app.config;
let currentSize = initialSize;
export { defaultSliderMin };

const data = await loadResults();
return { data };

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

const { previewUrl, type } = file;
const { x, width, height, zIndex } = layer.position;

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

Why: bindings keep the names defined by their source. When two models use different names, the mapping is explicit and the source stays qualified, such as `appKey: credentials.apiKey` or `userAccountId: row.user_account_id`. Repeated properties stored in variables are destructured together, while type and interface declarations add structure instead of only renaming an existing type. Framework-required exported names remain allowed.
