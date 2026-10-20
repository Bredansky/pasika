# Redundant Aliases Rule

Aliases give one value several names, making code harder to follow. Keep field names consistent, and make their source clear when a different name is needed.

- A `const` variable MUST NOT introduce a new name for another variable or object property, unless Next.js requires a specific exported name.
- An import MUST NOT rename an imported symbol, except a named underscore-containing font loader from `next/font/google` MAY use a camelCase alias.
- An export specifier MUST NOT introduce a second name for a symbol unless a framework requires the exported name.
- Destructuring MUST keep property names unchanged.
- When an object property uses an existing variable under the same name, it MUST use shorthand form.
- A direct data-contract field mapping whose names are not convention-equivalent MUST map to or from a contract controlled by an external service, third-party package, or runtime platform.
- Mappings between data contracts controlled by this repository MUST preserve one canonical field name.
- A direct field mapping MAY qualify the source field name with the source object's name.
- A renamed contract field MUST map directly between source and target contracts whose ownership can be determined.
- A variable MUST NOT be created just to read one object property. Use the property directly. Destructuring with a default value or rest properties is allowed.
- When a block reads two or more different properties from one object, it MUST destructure them together. Keep direct access when a namespace, field mapping, invalid variable name, or name conflict prevents this.
- Enum member accesses MUST remain qualified through the enum name, and enum values MUST NOT be object-destructured.
- A type alias that directly names one non-generic type or primitive type MUST NOT introduce a second name for that type.
- An empty interface that extends exactly one non-generic type MUST NOT introduce a second name for that type.

## Incorrect — Redundant Local Aliases

```ts
import { Toaster as Sonner } from "sonner";

const appKey = credentials.apiKey;
const { x: left } = layer.position;
const { previewUrl } = file;
```

Why: `Sonner`, `appKey`, and `left` rename existing values. `{ previewUrl }` adds an unnecessary variable for one field.

## Correct — Original Local Names

```ts
import { Toaster } from "sonner";

use(credentials.apiKey);
use(layer.position.x);
use(file.previewUrl);
```

Why: each value is read directly, without another name.

## Incorrect — Single Webhook Secret Binding

```ts
const { TELEGRAM_WEBHOOK_SECRET } = process.env;
if (!TELEGRAM_WEBHOOK_SECRET) throw new Error("Missing secret");
```

Why: the variable hides where the secret comes from.

## Correct — Qualified Webhook Secret Read

```ts
if (!process.env.TELEGRAM_WEBHOOK_SECRET) throw new Error("Missing secret");
```

Why: direct access makes the source clear.

## Incorrect — Partial Object Destructuring

```ts
function icon(config: EmojiIconConfig) {
  const { emoji, fontSize } = config;

  return {
    width: config.size,
    height: config.size,
    emoji,
    fontSize,
  };
}
```

Why: the code destructures two `config` fields but still reads `size` separately.

## Correct — Complete Object Destructuring

```ts
function icon(config: EmojiIconConfig) {
  const { emoji, size, fontSize } = config;

  return {
    width: size,
    height: size,
    emoji,
    fontSize,
  };
}
```

Why: all three fields come from one destructuring statement.

## Incorrect — Destructured Enum Members

```ts
enum Platform {
  Telegram = "telegram",
  Twitter = "twitter",
}

const { Telegram, Twitter } = Platform;
use(Telegram, Twitter);
```

Why: `Telegram` and `Twitter` lose their `Platform` prefix.

## Correct — Qualified Enum Members

```ts
enum Platform {
  Telegram = "telegram",
  Twitter = "twitter",
}

use(Platform.Telegram, Platform.Twitter);
```

Why: the `Platform` prefix makes it clear where each value belongs.

## Incorrect — Duplicate Repository Contracts

```ts
const credentialsSchema = z.object({
  accessTokenSecret: z.string(),
});

type RawCredentials = z.infer<typeof credentialsSchema>;

interface Credentials {
  accessSecret: string;
}

function credentialsOf(raw: RawCredentials): Credentials {
  return {
    accessSecret: raw.accessTokenSecret,
  };
}
```

Why: two names describe the same field.

## Correct — One Repository Contract

```ts
const credentialsSchema = z.object({
  accessTokenSecret: z.string(),
});

type Credentials = z.infer<typeof credentialsSchema>;
```

Why: one contract keeps the field name consistent.

## Incorrect — Unrelated Internal Field Name

```ts
interface File {
  id: string;
}

interface MediaLayer {
  mediaId: string;
}

function layerOf(file: File): MediaLayer {
  return {
    mediaId: file.id,
  };
}
```

Why: `mediaId` is an unrelated new name for `file.id`.

## Correct — Qualified Internal Field Name

```ts
interface File {
  id: string;
}

interface MediaLayer {
  fileId: string;
}

function layerOf(file: File): MediaLayer {
  return {
    fileId: file.id,
  };
}
```

Why: `fileId` clearly comes from `file.id`. Differences such as `user_account_id` versus `userAccountId` are just naming styles, not new meanings.
