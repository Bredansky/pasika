# Exports and Imports Rule

Without consistent exports, import paths, and layer boundaries, it is harder to tell what a file contains and which files may depend on it. This rule gives each file a predictable export style and keeps imports consistent with the application structure.

- A file that exports values MUST use named exports unless a framework or third-party package requires a different export style for that file.
- A `constants/`, `types/`, or `schemas/` `index.ts` MUST re-export a local sibling module only with `export * from` or `export type * from`; it MUST NOT use named re-exports to filter or rename that module's exports.
- Consecutive import declarations MUST NOT be separated by a blank line.
- An import whose target is in the current directory or its direct parent directory MUST use a relative path with `./` or `../`.
- A relative import MUST NOT traverse more than one parent directory; use the `@/*` alias instead of `../../` or deeper paths.
- A file under `src/compositions/` MUST NOT import from `src/app/`.
- A file in a feature folder MUST NOT import from another feature folder, `src/compositions/`, or `src/app/`.
- A file under `src/shared/` MUST NOT import from `src/app/`, `src/compositions/`, or a feature folder.
- A file in the `root` layer MUST NOT import from `src/app/`, `src/compositions/`, a feature folder, or `src/shared/`.
- A configuration module MUST import only from root support folders and its own files.

## Incorrect — Support Barrel Filters A Local Module

```ts
// src/features/editor/Poster/types/index.ts
export type { CanvasPayload, Layer } from "./canvas";
```

Why: the barrel chooses a subset of the local module's exports, creating a second place that controls the module's public surface.

## Correct — Support Barrel Mirrors The Local Module

```ts
// src/features/editor/Poster/types/index.ts
export type * from "./canvas";
```

Why: the barrel mirrors the local module exactly. If a declaration should not be public, remove its `export` in `canvas.ts`; if its name is wrong, rename the declaration at its source rather than in the barrel.

## Incorrect — Single-Export Utility Uses a Default Export

```ts
// src/utils/format-duration.ts
export default function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
```

Why: files use named exports even when they expose one item.

## Correct — Single-Export Utility Uses a Named Export

```ts
// src/utils/format-duration.ts
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
```

Why: the utility uses the same named-export form as every other file that does not have a package-required export contract.

## Incorrect — Relative Path Traverses Multiple Parents

```ts
// src/features/billing/InvoiceCard/rows/row.tsx
import { format } from "../../utils/format";
```

Why: relative imports may traverse at most one parent directory. A `../../` path must use the `@/*` alias instead.

## Correct — Relative Nearby, Alias When Deep

```ts
// src/features/stream/StreamBoard/schedule.ts
import { debounce } from "@/utils/debounce";
import { formatSlot } from "./utils/format-slot";
import { type StreamSlot } from "./types";
import { buildSchedule } from "../schedule-builder";
```

Why: imports in the current directory or direct parent use relative paths; the distant utility requires multiple parent traversals, so it uses the alias.

## Incorrect — Alias For A Direct Parent Import

```ts
// src/compositions/dashboard-view.tsx
import { locales } from "@/locales";
```

Why: the target is in the importer's direct parent directory, so the import must use `../`.

## Correct — Relative Path To The Direct Parent

```ts
// src/compositions/dashboard-view.tsx
import { locales } from "../locales";
```

Why: one parent traversal is allowed and must remain relative.

## Incorrect — Next.js Page Uses a Named Export

```tsx
// src/app/contact/page.tsx
import { locales } from "@/locales";

export function Page(): React.JSX.Element {
  return <main>{locales.contactUs}</main>;
}
```

Why: Next.js requires a `page.tsx` file to default-export its page component.

## Correct — Next.js Page Uses a Default Export

```tsx
// src/app/contact/page.tsx
import { locales } from "@/locales";

export default function Page(): React.JSX.Element {
  return <main>{locales.contactUs}</main>;
}
```

Why: the page follows the export contract Next.js requires.
