# Exports and Imports Rule

Without consistent exports, import paths, and layer boundaries, it is harder to tell what a file contains and which files may depend on it. This rule gives each file a predictable export style and keeps imports consistent with the application structure.

- A file that exports values MUST use named exports unless a framework or third-party package requires a different export style for that file.
- Imports MUST use relative paths for the same folder, a direct subfolder, or one folder up.
- Imports MUST use the `@/*` alias for anything beyond one folder up.
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
