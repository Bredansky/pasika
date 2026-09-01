# Exports and Imports Rule

Without consistent exports, import paths, and layer boundaries, it is harder to tell what a file contains and which files may depend on it. This rule gives each file a predictable export style and keeps imports consistent with the application structure.

- A file that exports values MUST use named exports unless a framework or third-party package requires a different export style for that file.
- Imports MUST use whichever of the relative path and the `@/*` alias has fewer segments, counting each `../` step and each name in the path as one segment.
- Imports MUST use the relative path when the relative path and the `@/*` alias have the same number of segments.
- A file under `src/compositions/` MUST NOT import from `src/app/`.
- A file in a feature folder MUST NOT import from another feature folder, `src/compositions/`, or `src/app/`.
- A file under `src/shared/` MUST NOT import from `src/app/`, `src/compositions/`, or a feature folder.
- A file in the `root` layer MUST NOT import from `src/app/`, `src/compositions/`, a feature folder, or `src/shared/`.
- A configuration module MUST import only from root support folders and its own files.

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

## Incorrect — Relative Path Longer Than the Alias

```ts
// src/features/stream/StreamBoard/schedule.ts
import { debounce } from "../../../utils/debounce";
```

Why: the relative path spends five segments — three `../` steps plus two names — where `@/utils/debounce` spends two, so this is the longer of the two forms.

## Correct — Shortest Form for Each Import

```ts
// src/features/stream/StreamBoard/schedule.ts
import { debounce } from "@/utils/debounce";
import { formatSlot } from "./utils/format-slot";
import { type StreamSlot } from "./types";
import { buildSchedule } from "../schedule-builder";
```

Why: the alias is shorter for the distant utility, while every import inside the component folder or its parent is shorter written relatively.

## Incorrect — Relative Path Where the Alias Is Shorter

```ts
// src/compositions/dashboard-view.tsx
import { locales } from "../locales";
```

Why: the relative path spends two segments against the alias's one, and stepping out of `src/compositions/` reads as though `locales` were a neighbouring file.

## Correct — Alias Where It Is Shorter

```ts
// src/compositions/dashboard-view.tsx
import { locales } from "@/locales";
```

Why: one segment against two makes the alias the shorter form, and it names the root folder the import actually comes from.

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
