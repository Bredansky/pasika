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
import { Toaster as Sonner } from "sonner";

const appKey = credentials.apiKey;
const { x: left } = layer.position;
const previewUrl = file.previewUrl;
```

Why: `Sonner`, `appKey`, and `left` give existing values new local names, while `previewUrl` stores a property under the same name instead of destructuring it.

## Correct — Original Local Names

```ts
import { Toaster } from "sonner";

const { apiKey } = credentials;
const { x } = layer.position;
const { previewUrl } = file;
```

Why: each binding keeps the name provided by its source.

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

## Incorrect — Unknown Contract Ownership

```ts
const externalFileSchema = z.object({
  file_id: z.string(),
});

type ExternalFile = z.infer<typeof externalFileSchema>;

function fileOf(raw: ExternalFile) {
  return {
    id: raw.file_id,
  };
}
```

Why: the source contract is known, but the returned object has no target contract whose owner can be determined.

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

Why: the external API owns `file_id`, while this repository owns `FileModel.id`, so the rename is an explicit adapter between two known contracts.
