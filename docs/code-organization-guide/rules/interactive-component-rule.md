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

      <form>
        <input type="search" placeholder={searchPlaceholder} />
      </form>
    </header>
  );
}
```

Why: the `<button>` and the `<input>` are both interactive content per the WHATWG HTML spec, but they sit inside `HeaderSection`'s `<header>` next to elements that have nothing to do with menu activation or searching. Neither interactive element has a name of its own in the file tree, so reviewers and tooling cannot locate "the menu button" or "the search field" as units; any code that toggles or tests them lands inside `header-section.tsx` mixed with header concerns.

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
  return (
    <form>
      <input type="search" placeholder={placeholder} />
    </form>
  );
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

Why: each interactive element now sits inside a named React component whose entire purpose is to own it. `menu-button.tsx` and `search-field.tsx` are the single locations those elements can be found, tested, and refactored from. `HeaderSection` no longer carries their markup inline, so changes to menu interaction don't bleed into search concerns, and a grep for `<button>` no longer returns menu-activation markup mixed in with title and search-input siblings.
