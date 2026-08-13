# Exports and Imports Rule

Without consistent export and import styles, it is harder to tell what a file contains and how other files should import from it. This rule gives each file type a predictable export style and keeps import paths consistent.

- Files MUST use named exports unless a third-party package requires a different export style for a specific file.
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
export function Page(): React.JSX.Element {
  return <main>Contact us</main>;
}
```

Why: Next.js requires a `page.tsx` file to default-export its page component.

## Correct — Next.js Page Uses a Default Export

```tsx
// src/app/contact/page.tsx
export default function Page(): React.JSX.Element {
  return <main>Contact us</main>;
}
```

Why: the page follows the export contract Next.js requires.
