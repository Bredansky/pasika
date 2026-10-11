# Redundant Aliases Rule

Aliases make one value appear under multiple names and can hide naming drift between data contracts, while ordinary local object shaping is not a contract mapping. A direct data-contract field mapping can qualify a field with its source object's name, and other renames should occur only where typed ownership proves a real external or platform boundary.

- A `const` variable MUST NOT introduce a new name for another variable or object property, unless Next.js requires a specific exported name.
- An import MUST NOT rename an imported symbol.
- An export specifier MUST NOT introduce a second name for a symbol unless a framework requires the exported name.
- Destructuring MUST keep property names unchanged.
- When an object property uses an existing variable under the same name, it MUST use shorthand form.
- A direct data-contract field mapping whose names are not convention-equivalent MUST map to or from a contract controlled by an external service, third-party package, or runtime platform.
- Mappings between data contracts controlled by this repository MUST preserve one canonical field name.
- A direct field mapping MAY qualify the source field name with the source object's name.
- A renamed contract field MUST map directly between source and target contracts whose ownership can be determined.
- When only one property is read from an object within a block, a local binding that merely caches that property SHOULD NOT be introduced; prefer qualified property access unless preserving a snapshot, default, rest value, or an evaluated source requires the binding.
- When two or more distinct properties are read from the same object identifier within the same block, they MUST be destructured together in one declaration unless access must remain qualified to preserve a namespace or contract mapping, the property name cannot be used as a compliant local identifier, or destructuring would conflict with another binding.
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

Why: `Sonner`, `appKey`, and `left` give existing values new local names, while the single `previewUrl` binding is redundant when qualified access suffices.

## Correct — Original Local Names

```ts
import { Toaster } from "sonner";

use(credentials.apiKey);
use(layer.position.x);
use(file.previewUrl);
```

Why: each single property stays qualified at the use site, without introducing an unnecessary local binding.

## Incorrect — Single Webhook Secret Binding

```ts
const { TELEGRAM_WEBHOOK_SECRET } = process.env;
if (!TELEGRAM_WEBHOOK_SECRET) throw new Error("Missing secret");
```

Why: the local binding hides its source when only one environment property is needed.

## Correct — Qualified Webhook Secret Read

```ts
if (!process.env.TELEGRAM_WEBHOOK_SECRET) throw new Error("Missing secret");
```

Why: a direct read keeps the environment source visible. When code intentionally needs a stable snapshot of a mutable value, retain the local binding instead.

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

Why: the same object supplies several values in one block, but `size` is still read through `config`.

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

Why: all values read from `config` in the block come from one destructuring declaration.

## Incorrect — Destructured Enum Members

```ts
enum Platform {
  Telegram = "telegram",
  Twitter = "twitter",
}

const { Telegram, Twitter } = Platform;
use(Telegram, Twitter);
```

Why: destructuring erases the enum qualifier at each use site and makes enum members look like unrelated local values.

## Correct — Qualified Enum Members

```ts
enum Platform {
  Telegram = "telegram",
  Twitter = "twitter",
}

use(Platform.Telegram, Platform.Twitter);
```

Why: qualified access keeps the enum domain visible wherever a member is used.

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

Why: both contracts describe the same value, but one calls it `accessTokenSecret` and the other calls it `accessSecret`.

## Correct — One Repository Contract

```ts
const credentialsSchema = z.object({
  accessTokenSecret: z.string(),
});

type Credentials = z.infer<typeof credentialsSchema>;
```

Why: one contract is enough when the shape and semantics are the same, so no mapper or second field name is introduced.

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

Why: `fileId` is derived directly from the source object name `file` and the source field name `id`. Names that differ only by convention, such as `user_account_id` and `userAccountId`, are also not semantic renames.
