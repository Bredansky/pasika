# Constants Rule

Duplicated constants are hard to keep in sync, while extracting every single-use value creates unnecessary files. This rule keeps reused constants in one file and leaves single-use values close to their consumer.

- A value MUST remain in its declaring component or file until another file imports it independently; it MUST then be extracted as a constant.
- A TypeScript `enum` MUST always live in a `constants/` folder because it creates runtime values as well as a type.
- An API contract created with `defineApiContract` MUST live in a `constants/` folder at the CCF of its consumers; the Zod schemas referenced by the contract remain schemas.
- Extracted constants MUST live in a `constants/` folder at the CCF of their consumers.
- Consumers MUST import an extracted constant through the `index.ts` in that constant's `constants/` folder.
- A `constants/` folder with no sibling file MUST define its exports directly in `index.ts`; with exactly one sibling file, it MUST define that file's exports directly in `index.ts`; with several sibling files, it MUST group related constants in files that `index.ts` re-exports.
- A file in `constants/` MUST calculate each exported constant's CCF from that constant's direct consumers and MUST split exports whose CCFs differ.
- When a constant's CCF is `src/features/`, it MUST move to `src/constants/`.
- A constant MAY live in `src/config/<config-name>/` instead of a `constants/` folder when a developer determines that it configures application behavior and is best understood alongside the configuration that parameterizes it, even when consumers exist outside the configuration file.
- A constant's name MUST be `camelCase`, unless a framework requires a specific name for it (for example, a Next.js route handler exported as `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, or `OPTIONS`).
- A raw literal SHOULD NOT be repeated when the same value is available through an existing enum/constant.
- A raw numeric value MUST NOT be repeated under the same semantic slot across production files; repeated named numeric values MUST use one extracted constant or enum. The values `-1`, `0`, and `1` MAY still be written inline.
- A fixed set of named string or number values MUST be a TypeScript `enum` instead of an object literal marked `as const`, a named type alias made only of string/number literals, or a property declared as an inline string/number literal union.
- A constant with no consumer outside `src/app/` MUST live under `src/features/<feature>/`. If no existing feature applies, it MUST introduce a new feature folder.

## Incorrect — Screaming-Case Constant for an Ordinary Value

```ts
// src/constants/index.ts
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
```

Why: `MAX_FILE_SIZE` is a plain value with no framework requirement on its name, so it must be `camelCase`.

## Correct — camelCase Constant

```ts
// src/constants/index.ts
export const maxFileSize = 20 * 1024 * 1024;
```

## Incorrect — Repeated Named Numeric Value Across Files

```ts
// src/features/editor/preview.ts
const compositionWidth = 360;
```

```ts
// src/features/editor/generate.ts
generatePreview({ width: 360 });
```

Why: `compositionWidth` and `width` share the semantic slot `width`, so repeating the same numeric value across production files creates two sources of truth.

## Correct — Shared Numeric Constant

```ts
// src/features/editor/constants/index.ts
export const previewWidth = 360;
```

```ts
// src/features/editor/preview.ts
import { previewWidth } from "./constants";

const compositionWidth = previewWidth;
```

```ts
// src/features/editor/generate.ts
import { previewWidth } from "./constants";

generatePreview({ width: previewWidth });
```

Why: the numeric value has one definition at the consumers' CCF, while each consumer can still use a locally meaningful name or property.

## Incorrect — `as const` Object for a Fixed Set of Values

```ts
// src/constants/index.ts
const languageLabels = { ua: "UA", pl: "PL", en: "EN" } as const;
```

Why: `languageLabels` maps fixed keys to literal string values, which is exactly what an `enum` expresses; an `as const` object hides that intent behind a generic literal type.

## Correct — `enum` for a Fixed Set of Values

```ts
// src/constants/index.ts
enum LanguageLabel {
  Ukrainian = "UA",
  Polish = "PL",
  English = "EN",
}
```

Why: `LanguageLabel` states its closed set of values as an `enum`, matching the constant's actual shape.

## Incorrect — Literal Union for a Fixed Named Set

```ts
export type AlignmentGuideId = "center-x" | "center-y" | "top" | "bottom" | "left" | "right";
```

Why: the alias introduces a named closed set of primitive values but provides no enum members for consumers to reference.

## Correct — Enum for a Fixed Named Set

```ts
export enum AlignmentGuideId {
  CenterX = "center-x",
  CenterY = "center-y",
  Top = "top",
  Bottom = "bottom",
  Left = "left",
  Right = "right",
}
```

Why: the enum gives the closed set one canonical runtime and type-level representation.

## Incorrect — Inline Literal Union for a Property

```ts
interface AlignmentGuide {
  axis: "horizontal" | "vertical";
  kind: "center" | "edge";
}
```

Why: each property declares a reusable closed domain with raw literals instead of giving that domain canonical enum members.

## Correct — Enum Types for Closed Property Domains

```ts
enum AlignmentGuideAxis {
  Horizontal = "horizontal",
  Vertical = "vertical",
}

enum AlignmentGuideKind {
  Center = "center",
  Edge = "edge",
}

interface AlignmentGuide {
  axis: AlignmentGuideAxis;
  kind: AlignmentGuideKind;
}
```

Why: callers use canonical enum members instead of repeating domain literals.

## Incorrect — Enum for Structural Key Selection

```ts
enum PositionKey {
  X = "x",
  Y = "y",
  Width = "width",
  Height = "height",
}

type LayerBox = Pick<Position, PositionKey>;
```

Why: the enum invents a runtime domain only to select keys from an existing type.

## Correct — Literal Union as Structural Key Selection

```ts
type LayerBox = Pick<Position, "x" | "y" | "width" | "height">;
```

Why: these literals select keys from an existing type; they do not declare a new domain of runtime values.

## Incorrect — Renaming a Framework-Required Export

```ts
// src/app/api/posts/route.ts
export const httpGet = async () => new Response();
```

Why: Next.js requires the exact name `GET` for this export to be recognized as a route handler.

## Correct — Framework-Required Name Kept As Is

```ts
// src/app/api/posts/route.ts
export const GET = async () => new Response();
```

Why: `GET` is the name Next.js requires for a route handler; every other constant still uses `camelCase`.

## Incorrect — Constant Imported Without `constants/index.ts`

```ts
// src/features/billing/constants/max-retries.ts
export const maxRetries = 3;
```

```ts
// src/features/billing/hooks/use-retry-payment.ts
import { maxRetries } from "../constants/max-retries";
```

Why: the consumer bypasses the feature's `constants/index.ts`.

## Correct — Grouped Constants Re-Exported from `constants/index.ts`

```ts
// src/features/billing/constants/retry.ts
export const maxRetries = 3;
export const retryDelayMs = 1_000;

// src/features/billing/constants/index.ts
export { maxRetries, retryDelayMs } from "./retry";
```

```ts
// src/features/billing/hooks/use-retry-payment.ts
import { maxRetries } from "../constants";
```

Why: the constants are available through the feature's `constants/index.ts`.

## Incorrect — Feature and Composition Constant Kept in a Feature

```ts
// src/features/billing/constants/index.ts
export const paymentRetryDelayMs = 1_000;

// src/features/billing/hooks/use-retry-payment.ts
import { paymentRetryDelayMs } from "../constants";

// src/compositions/BillingDashboard.tsx
import { paymentRetryDelayMs } from "@/features/billing/constants";
```

Why: the feature and composition have `src/` as their CCF, but the constant remains in the billing feature.

## Correct — Feature and Composition Constant in `src/constants/`

```ts
// src/constants/index.ts
export const paymentRetryDelayMs = 1_000;
```

```tsx
// src/features/billing/hooks/use-retry-payment.ts
import { paymentRetryDelayMs } from "@/constants";

// src/compositions/BillingDashboard.tsx
import { paymentRetryDelayMs } from "@/constants";
```

Why: the feature and composition have `src/` as their CCF, so the constant lives in `src/constants/`.

## Incorrect — Route-Only Constant in `src/constants/`

```ts
// src/constants/max-render-jobs.ts
export const maxRenderJobs = 10;
```

```ts
// src/app/api/render-instagram-content/route.ts
import { maxRenderJobs } from "@/constants/max-render-jobs";
```

Why: the constant's only consumer is a route under `src/app/`, which never counts toward a CCF, so `src/constants/` has not been earned by any real reuse.

## Correct — Route-Only Constant in the Feature It Represents

```ts
// src/features/editor/constants/max-render-jobs.ts
export const maxRenderJobs = 10;
```

```ts
// src/app/api/render-instagram-content/route.ts
import { maxRenderJobs } from "@/features/editor/constants/max-render-jobs";
```

Why: with no consumer outside `src/app/`, the constant belongs in the feature it represents, the same way a component with no outside consumer does.
