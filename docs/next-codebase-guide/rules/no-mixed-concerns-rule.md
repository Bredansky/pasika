# No Mixed Concerns Rule

One component per file keeps components easy to find and change independently. This rule fixes how many components a component file holds.

- A `.tsx` file that defines a component MUST NOT contain a second component.
- A component `.tsx` file MUST NOT re-export another component.
- A supporting non-component export from a component MUST stay in its `.tsx` file when every consumer also imports the component.
- A constant, enum, type, or schema imported only by a component and consumers that also import the component MUST be defined in its `.tsx` file, not in a separate support module. Independently consumed values MUST remain in their matching `constants/`, `types/`, or `schemas/` folder.
- A dynamic Next.js `page.tsx` or `layout.tsx` MAY export `generateStaticParams`; a static route MUST NOT export it.

## Incorrect — Two Components in One File

Two components in one file:

```tsx
// src/features/nav/menu.tsx
export function Menu(): React.JSX.Element {
  return (
    <nav>
      <MenuItem label="Home" />
      <MenuItem label="About" />
    </nav>
  );
}

export function MenuItem({ label }: { label: string }): React.JSX.Element {
  return <a href="#">{label}</a>;
}
```

Why: two components share `menu.tsx`, so a reviewer searching for `MenuItem` cannot find it in the file tree.

## Correct — Extracted Child in Its Own File

One component per file, with the extracted child nested under its owner:

```text
src/features/nav/
  menu/
    index.ts                  # re-exports only menu.tsx
    menu.tsx
    menu-item.tsx             # exclusive child — imported directly by menu.tsx
```

```tsx
// src/features/nav/menu/menu-item.tsx
export function MenuItem({ label }: { label: string }): React.JSX.Element {
  return <a href="#">{label}</a>;
}
```

```tsx
// src/features/nav/menu/menu.tsx
import { MenuItem } from "./menu-item";
import { locales } from "@/locales";

export function Menu(): React.JSX.Element {
  return (
    <nav>
      <MenuItem label={locales.nav.home} />
      <MenuItem label={locales.nav.about} />
    </nav>
  );
}
```

Why: `Menu` and `MenuItem` each have their own file, so both are independently searchable.

## Incorrect — Extracting an Enum Used Only With Its Component

```ts
// src/features/feed/constants/index.ts
export enum FeedSort {
  Newest = "newest",
  Oldest = "oldest",
}
```

```tsx
// src/features/feed/feed-sort-select.tsx
import { FeedSort } from "./constants";
import { z } from "zod";

const feedSortSchema = z.enum(FeedSort);
type FeedSortSelectProps = {
  value: FeedSort;
  onChange: (value: FeedSort) => void;
};

export function FeedSortSelect({ value, onChange }: FeedSortSelectProps) {
  return (
    <select value={value} onChange={(event) => onChange(feedSortSchema.parse(event.currentTarget.value))}>
      <option value={FeedSort.Newest}>Newest</option>
      <option value={FeedSort.Oldest}>Oldest</option>
    </select>
  );
}
```

Why: `FeedSort` is only used by `FeedSortSelect` and consumers that also import that component, so a separate constants module is premature.

## Correct — Keep Component-Owned Definitions Together

```tsx
// src/features/feed/feed-sort-select.tsx
import { z } from "zod";

export enum FeedSort {
  Newest = "newest",
  Oldest = "oldest",
}

const feedSortSchema = z.enum(FeedSort);
type FeedSortSelectProps = {
  value: FeedSort;
  onChange: (value: FeedSort) => void;
};

export function FeedSortSelect({ value, onChange }: FeedSortSelectProps) {
  return (
    <select value={value} onChange={(event) => onChange(feedSortSchema.parse(event.currentTarget.value))}>
      <option value={FeedSort.Newest}>Newest</option>
      <option value={FeedSort.Oldest}>Oldest</option>
    </select>
  );
}
```

```tsx
// src/features/feed/feed-toolbar.tsx
import { useState } from "react";
import { FeedSort, FeedSortSelect } from "./feed-sort-select";

export function FeedToolbar() {
  const [sort, setSort] = useState(FeedSort.Newest);
  return <FeedSortSelect value={sort} onChange={setSort} />;
}
```

Why: the enum is exported alongside its component because the toolbar uses both, while the schema and props type remain private because only the component needs them. Extract any of these definitions only when another file consumes it independently of `FeedSortSelect`.

## Incorrect — Importing a Colocated Variant Without Its Component

```tsx
// badge.tsx
const badgeVariants = cva("inline-flex");
function Badge() {
  return <span />;
}
export { Badge, badgeVariants };

// elsewhere.ts
import { badgeVariants } from "./badge";
```

Why: the consumer only needs the variants, so the variants belong in a separate module.

## Correct — Importing a Colocated Variant With Its Component

```tsx
// badge.tsx
const badgeVariants = cva("inline-flex");
function Badge() {
  return <span className={badgeVariants()} />;
}
export { Badge, badgeVariants };

// elsewhere.tsx
import { Badge, badgeVariants } from "./badge";
export function Preview() {
  return <Badge className={badgeVariants()} />;
}
```

Why: the exported styling helper remains coupled to the component that owns it.
