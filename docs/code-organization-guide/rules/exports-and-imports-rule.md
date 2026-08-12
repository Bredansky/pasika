# Exports and Imports Rule

Without consistent export and import styles, it is harder to tell what a file contains and how other files should import from it. This rule gives each file type a predictable export style and keeps import paths consistent.

- A component MUST be the default export of its `.tsx` file.
- A component folder's `index.ts` MUST default-re-export only that folder's public component.
- A type MUST use a named export, including when its leaf file contains one type.
- A type, schema, or other aggregation barrel MUST use named re-exports, including when it currently exposes one item.
- `constants/index.ts` MUST define and expose constants through named exports.
- `locales/index.ts` MUST default-export its single `locales` object.
- An ordinary non-component leaf module with one export MUST use a default export unless a more specific non-component file rule requires a named export.
- An ordinary non-component module with two or more exports MUST use named exports only.
- Framework and tool entry files MUST follow the export contract required by their framework or tool.
- A `.tsx` component MAY have companion named exports when no consumer imports them independently of the component.
- Imports MUST use relative paths for the same folder, a direct subfolder, or one folder up.
- Imports MUST use the `@/*` alias for anything beyond one folder up.
- The relative-versus-alias boundary MUST be enforced with ESLint rather than code review alone.

## Incorrect — Single-Export Utility Uses a Named Export

```ts
// src/utils/format-duration.ts
export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};
```

Why: an ordinary leaf utility with one export uses the default-export branch, giving the file one primary subject.

## Correct — Single-Export Utility Uses Default

```ts
// src/utils/format-duration.ts
export default function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
```

Why: the file has one primary non-component export and imports cleanly by that subject.

## Incorrect — Multi-Export Module Mixes Styles

```ts
// src/utils/date.ts
export const formatDate = (date: Date): string => date.toLocaleDateString();
export default function parseDate(value: string): Date {
  return new Date(value);
}
```

Why: one domain module mixes default and named imports even though neither export is the sole subject.

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
export { default } from "./date-range";
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

## Incorrect — Component Folder Uses a Named Public Re-Export

```ts
// src/features/blog/BlogPage/index.ts
export { default as BlogPage } from "./BlogPage";
```

Why: a component folder has one public component subject, so its entry point follows that component's default-export contract.

## Correct — Component Folder Default-Re-Exports Its Component

```ts
// src/features/blog/BlogPage/index.ts
export { default } from "./BlogPage";
```

Why: the folder entry point exposes its one public component while private children remain direct internal imports.

## Incorrect — Deep Relative Path

```ts
// src/features/stream/StreamBoard/schedule.ts
import debounce from "../../../utils/debounce";
```

Why: reaching more than one folder up hides the cross-scope dependency in relative path traversal.

## Correct — Alias Across Scopes and Relative Paths Nearby

```ts
// src/features/stream/StreamBoard/schedule.ts
import debounce from "@/utils/debounce";
import formatSlot from "./utils/format-slot";
import { type StreamSlot } from "./types";
import buildSchedule from "../schedule-builder";
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
