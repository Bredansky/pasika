# Exports and Imports Rule

Inconsistent export styles make imports unpredictable and force every consumer to invent import-time names. Deep relative paths are fragile when folders move and hard to scan visually. The conventions below pin both so every contributor can both write and read any file the same way.

- React components (`.tsx` files in `src/`) MUST use `export default`, even alongside companion named exports.
- Non-component files (`.ts` files in `src/`) MUST use named exports only, never `export default`.
- Imports MUST use relative paths (`./` or `../`) for the same folder, a direct subfolder of it, or one folder up.
- Imports MUST use aliases for anything beyond one folder up. In this repo the alias root is `@/*` as configured in `tsconfig.json`.
- The relative-vs-alias split MUST be enforced with ESLint, not left to code review.

## Incorrect — .ts file with default export

```ts
// utils/math.ts
export default function sum(a: number, b: number) {
  return a + b;
}
```

Why: `.ts` files have to use named exports only.

## Correct — .ts file with named exports

```ts
// utils/math.ts
export const sum = (a: number, b: number) => a + b;
export const subtract = (a: number, b: number) => a - b;
```

Why: `.ts` files have to use named exports only.

## Incorrect — .tsx component uses only named exports

```tsx
// src/features/menu/menu-card.tsx
export const MenuCard = ({ label }: Props) => {
  return <a href="#">{label}</a>;
};
```

Why: components have to use `export default`.

## Correct — .tsx component uses export default, with optional companion named exports

```tsx
// src/features/menu/menu-card.tsx
export enum MenuCardVariant {
  Horizontal = "horizontal",
  Vertical = "vertical",
}

export default function MenuCard({ label }: { label: string }) {
  return <a href="#">{label}</a>;
}
```

```tsx
// src/features/menu/menu.tsx
import MenuCard, { MenuCardVariant } from "./menu-card";
```

Why: components have to use `export default`.

## Incorrect — deep relative path without alias

```ts
// src/features/stream/StreamBoard/schedule.ts
import { debounce } from "../../../utils/debounce";
```

Why: `../../../` reaches three folders up to `src/utils/`, and imports more than one folder up have to use an alias.

## Correct — alias for cross-folder, relative for nearby

```ts
// src/features/stream/StreamBoard/schedule.ts
import { debounce } from "@/utils/debounce"; // alias — more than one folder up
import { formatSlot } from "./utils/format-slot"; // relative — direct subfolder
import { type StreamSlot } from "./types"; // relative — direct subfolder
import { buildSchedule } from "../schedule-builder"; // relative — one folder up
```

Why: the same `debounce` import now uses an alias because it is more than one folder up; the same folder, a direct subfolder, and one folder up still use relative paths.
