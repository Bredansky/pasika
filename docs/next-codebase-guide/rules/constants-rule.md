# Constants Rule

Duplicated constants are hard to keep in sync, while extracting every single-use value creates unnecessary files. This rule keeps reused constants in one file and leaves single-use values close to their consumer.

- A single named string or number value MUST be represented by a `const`, not a one-member `enum`; a numeric value written only once MAY remain inline.
- Every runtime string value MUST be a named const or enum member; an inline string MAY appear only inside a JSX className prop.
- A reusable, closed set of two or more related string or numeric values MUST be represented by a TypeScript `enum`.
- A recognized closed runtime string domain MUST reuse a shared enum even when its distinct members each appear only once.
- A string or numeric literal MUST reuse a uniquely matching existing constant or enum; repeated literals representing the same semantic value MUST share one canonical definition.
- Repeated named numeric values in the same semantic slot across production files MUST share a constant; `-1`, `0`, and `1` MAY remain inline.
- A constant or enum MUST remain in its declaring file until another file imports it; only then MUST it be extracted for sharing.
- Shared constants and enums MUST live in `constants/` at their direct consumers' CCF, using `src/constants/` when the CCF is `src/features/`.
- A `constants/` file MUST split exported constants whose direct consumers have different CCFs.
- A constant with no consumer outside `src/app/` MUST live under `src/features/<feature>/`. If no existing feature applies, it MUST introduce a new feature folder.
- A constant MAY stay in `src/config/<config-name>/` when it configures that module's behavior, even if other files consume it.
- A `constants/` folder MUST expose constants through `index.ts`, defining them there when it has at most one sibling file and re-exporting grouped constants otherwise; imports between sibling files MUST be direct.
- A constant's name MUST be `camelCase`, except when a framework requires an exact export name.

## Incorrect — Inline Runtime Strings

```tsx
function Card() {
  return <section title="Draft">Draft</section>;
}

fetch("/api/drafts");
localStorage.setItem("theme", value);
```

Why: UI copy, API URLs, and storage keys are runtime values, even when they are used only once.

## Correct — Named Values And JSX Class Names

```tsx
const draftTitle = "Draft";
const themeStorageKey = "theme";

enum ApiRoute {
  Drafts = "/api/drafts",
  Post = "/api/post",
}

function Card() {
  return (
    <section className="p-4" title={draftTitle}>
      {draftTitle}
    </section>
  );
}

fetch(ApiRoute.Drafts);
localStorage.setItem(themeStorageKey, value);
```

Why: every runtime string is named, and only the JSX className property contains an inline string. Import/export module specifiers, syntax directives such as `"use client"`, object property names and TypeScript structural type keys are language syntax rather than runtime string values.

## Incorrect — Unique Raw Values In A Closed Route Domain

```ts
const list = { path: "/api/orders" };
const create = { path: "/api/orders/create" };
```

Why: each route occurs only once, but together they form a closed runtime vocabulary rather than independent ad-hoc text.

## Correct — One Canonical Route Enum

```ts
enum ApiRoute {
  Orders = "/api/orders",
  CreateOrder = "/api/orders/create",
}

const list = { path: ApiRoute.Orders };
const create = { path: ApiRoute.CreateOrder };
```

Why: named route members remain the single source of truth for clients, contracts, and route checks. The same principle applies to recognized event and storage-key domains.

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

## Incorrect — Const Tuple Used as a Named Enum Domain

```ts
export const draftMediaStatuses = ["pending", "stored", "too_large", "failed"] as const;
export type DraftMediaStatus = (typeof draftMediaStatuses)[number];
const draftMediaRowSchema = z.object({ status: z.enum(draftMediaStatuses) });
```

Why: the tuple defines a reusable domain in both the type system and runtime validation. Maintain one named TypeScript enum instead; this also lets different features import the same definition without duplicating string arrays.

## Correct — Named Enum Used by Zod

```ts
export enum DraftMediaStatusEnum {
  Pending = "pending",
  Stored = "stored",
  TooLarge = "too_large",
  Failed = "failed",
}

const draftMediaRowSchema = z.object({ status: z.enum(DraftMediaStatusEnum) });
```

Why: the enum is the single source of truth for runtime and type-level values. Ordinary tuples used for ordering, positional data, or options are unaffected unless they define an enum-like domain.

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

## Correct — Constants Defined in `constants/index.ts`

```ts
// src/features/billing/constants/index.ts
export const maxRetries = 3;
export const retryDelayMs = 1_000;
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
// src/features/editor/constants/index.ts
export const maxRenderJobs = 10;
```

```ts
// src/app/api/render-instagram-content/route.ts
import { maxRenderJobs } from "@/features/editor/constants";
```

Why: with no consumer outside `src/app/`, the constant belongs in the feature it represents, the same way a component with no outside consumer does.
