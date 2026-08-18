# Interactive Component Rule

Large component files need a clear way to decide what to extract first. This rule treats interactive elements as meaningful component boundaries instead of extracting arbitrary layout elements.

- An [interactive HTML element](https://html.spec.whatwg.org/multipage/dom.html#interactive-content) MUST be extracted to a component with a descriptive name.

## Incorrect — Interactive Element Kept Inline

```tsx
// src/features/layout/header-section.tsx
import { locales } from "@/locales";

export function HeaderSection({
  onMenuClick,
  searchPlaceholder,
}: {
  onMenuClick: () => void;
  searchPlaceholder: string;
}): React.JSX.Element {
  return (
    <header>
      <h1>{locales.layout.headerTitle}</h1>

      <button onClick={onMenuClick} aria-label={locales.layout.openMenu}>
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
type MenuButtonProps = React.ComponentProps<"button">;

export function MenuButton({ onClick, ...props }: MenuButtonProps): React.JSX.Element {
  return (
    <button {...props} onClick={onClick}>
      <Icon name="menu" />
    </button>
  );
}
```

```tsx
// src/features/layout/header-section/search-field.tsx
type SearchFieldProps = Omit<React.ComponentProps<"input">, "type">;

export function SearchField(props: SearchFieldProps): React.JSX.Element {
  return <input {...props} type="search" />;
}
```

```tsx
// src/features/layout/header-section/header-section.tsx — now imports both interactive units instead of inline JSX

import { MenuButton } from "./menu-button";
import { SearchField } from "./search-field";
import { locales } from "@/locales";

type HeaderSectionProps = {
  onMenuClick: () => void;
  searchPlaceholder: string;
};

export function HeaderSection({
  onMenuClick,
  searchPlaceholder,
}: HeaderSectionProps): React.JSX.Element {
  return (
    <header>
      <h1>{locales.layout.headerTitle}</h1>

      <MenuButton onClick={onMenuClick} aria-label={locales.layout.openMenu} />

      <SearchField placeholder={searchPlaceholder} />
    </header>
  );
}
```

Why: each interactive element now has its own descriptive component, leaving `HeaderSection` to compose them.
