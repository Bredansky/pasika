# Exports and Imports Rule

Without consistent export and import styles, it is harder to tell what a file contains and how other files should import from it. This rule gives each file type a predictable export style and keeps import paths consistent.

- Files MUST use named exports unless a third-party package requires a different export style for a specific file.
- A type MUST use a named export, including when its leaf file contains one type.
- A type, schema, or other aggregation barrel MUST use named re-exports, including when it currently exposes one item.
- `constants/index.ts` MUST define and expose constants through named exports.
- `locales/index.ts` MUST expose its `locales` object through a named export.
- Imports MUST use relative paths for the same folder, a direct subfolder, or one folder up.
- Imports MUST use the `@/*` alias for anything beyond one folder up.
- ESLint MUST enforce this rule's export and import restrictions.

## Incorrect — Single-Export Utility Uses a Default Export

```ts
// src/utils/format-duration.ts
export default function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
```

Why: ordinary modules use named exports even when they expose one item.

## Correct — Single-Export Utility Uses a Named Export

```ts
// src/utils/format-duration.ts
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
```

Why: the utility has the same named-export form as every other ordinary module.

## Incorrect — Multi-Export Module Mixes Styles

```ts
// src/utils/date.ts
export const formatDate = (date: Date): string => date.toLocaleDateString();
export default function parseDate(value: string): Date {
  return new Date(value);
}
```

Why: ordinary modules use named exports only.

## Correct — Multi-Export Module Uses Named Exports

```ts
// src/utils/date.ts
export const formatDate = (date: Date): string => date.toLocaleDateString();
export const parseDate = (value: string): Date => new Date(value);
```

Why: every export from the grouped domain module has one predictable import form.

## Incorrect — Type Barrel Changes Shape at One Export

```ts
// src/features/billing/types/index.ts
export type { DateRange as default } from "./date-range";
```

Why: the first additional type would force the barrel and every consumer to switch from default to named imports.

## Correct — Type Leaf and Barrel Stay Named

```ts
// src/features/billing/types/date-range.ts
export type DateRange = { from: Date; to: Date };

// src/features/billing/types/index.ts
export type { DateRange } from "./date-range";
```

Why: types use named exports and the aggregation barrel keeps the same public shape as it grows.

## Incorrect — Nested Component Folder Uses a Default Re-Export

```ts
// src/features/blog/BlogPage/index.ts
export { BlogPage as default } from "./BlogPage";
```

Why: a nested component folder exposes its component through a named re-export.

## Correct — Nested Component Folder Uses a Named Re-Export

```ts
// src/features/blog/BlogPage/index.ts
export { BlogPage } from "./BlogPage";
```

Why: the folder entry point exposes only its nested component while private children remain direct internal imports.

## Incorrect — Deep Relative Path

```ts
// src/features/stream/StreamBoard/schedule.ts
import { debounce } from "../../../utils/debounce";
```

Why: reaching more than one folder up hides the cross-scope dependency in relative path traversal.

## Correct — Alias Across Scopes and Relative Paths Nearby

```ts
// src/features/stream/StreamBoard/schedule.ts
import { debounce } from "@/utils/debounce";
import { formatSlot } from "./utils/format-slot";
import { type StreamSlot } from "./types";
import { buildSchedule } from "../schedule-builder";
```

Why: the alias identifies the distant dependency while nearby files keep short relative paths.

## Incorrect — Framework Handler Forced to Default

```ts
// src/app/api/status/route.ts
export default async function GET(): Promise<Response> {
  return Response.json({ ok: true });
}
```

Why: the generic single-export convention cannot replace a framework entry file's required contract.

## Correct — Framework Entry Uses Its Required Export

```ts
// src/app/api/status/route.ts
export async function GET(): Promise<Response> {
  return Response.json({ ok: true });
}
```

Why: framework and tool entry files retain the exact exports their runtime discovers.
