# Interactive Component Rule

Large component files need a clear way to decide what to extract first. This rule treats interactive elements as meaningful component boundaries instead of extracting arbitrary layout elements.

- [Interactive HTML elements](https://html.spec.whatwg.org/multipage/dom.html#interactive-content) MUST be extracted to a component with a descriptive name.

## Incorrect — Interactive Element Kept Inline

```tsx
// src/features/layout/header-section.tsx

export function HeaderSection({
  onMenuClick,
  searchPlaceholder,
}: {
  onMenuClick: () => void;
  searchPlaceholder: string;
}): React.JSX.Element {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <h1 className="text-2xl">Page Title</h1>

      <button onClick={onMenuClick} aria-label="Open menu">
        <Icon name="menu" />
      </button>

      <input type="search" placeholder={searchPlaceholder} />
    </header>
  );
}
```

Why: the interactive elements remain mixed into `HeaderSection` instead of having their own components.

## Correct — Interactive Element Extracted

```text
src/features/layout/
  header-section/
    index.ts                  # re-exports only header-section.tsx
    header-section.tsx
    menu-button.tsx           # exclusive child — imported directly
    search-field.tsx          # exclusive child — imported directly
```

```tsx
// src/features/layout/header-section/menu-button.tsx

export function MenuButton({ onMenuClick }: { onMenuClick: () => void }): React.JSX.Element {
  return (
    <button onClick={onMenuClick} aria-label="Open menu">
      <Icon name="menu" />
    </button>
  );
}
```

```tsx
// src/features/layout/header-section/search-field.tsx

export function SearchField({ placeholder }: { placeholder: string }): React.JSX.Element {
  return <input type="search" placeholder={placeholder} />;
}
```

```tsx
// src/features/layout/header-section/header-section.tsx — now imports both interactive units instead of inline JSX

import { MenuButton } from "./menu-button";
import { SearchField } from "./search-field";

export function HeaderSection({
  onMenuClick,
  searchPlaceholder,
}: {
  onMenuClick: () => void;
  searchPlaceholder: string;
}): React.JSX.Element {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <h1 className="text-2xl">Page Title</h1>

      <MenuButton onMenuClick={onMenuClick} />

      <SearchField placeholder={searchPlaceholder} />
    </header>
  );
}
```

Why: each interactive element now has its own descriptive component, leaving `HeaderSection` to compose them.
