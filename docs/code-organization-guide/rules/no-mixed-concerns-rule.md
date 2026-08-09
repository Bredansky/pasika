# No Mixed Concerns Rule

A component file that does too many things becomes hard to find, test, and reuse.

- A `.tsx` file MUST contain exactly one React component.

## Incorrect

Two components in one file:

```tsx
// src/features/nav/menu.tsx
export default function Menu(): React.JSX.Element {
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

## Correct

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
export default function MenuItem({ label }: { label: string }): React.JSX.Element {
  return <a href="#">{label}</a>;
}
```

```tsx
// src/features/nav/menu/menu.tsx
import MenuItem from "./menu-item";

export default function Menu(): React.JSX.Element {
  return (
    <nav>
      <MenuItem label="Home" />
      <MenuItem label="About" />
    </nav>
  );
}
```

Why: each component owns its file, so `Menu` and `MenuItem` are independently searchable and importable. `MenuItem` is exclusive to `Menu`, so `Menu` becomes a folder whose barrel exposes only the parent.
