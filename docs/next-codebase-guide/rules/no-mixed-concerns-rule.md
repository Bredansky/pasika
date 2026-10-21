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

## Incorrect — Extracting Component-Only Values

```tsx
// src/shared/ascii-divider.tsx
import { AsciiDividerVariant } from "@/constants";

export function AsciiDivider({ variant = AsciiDividerVariant.Stars }: AsciiDividerProps) {
  return <div>{variant}</div>;
}
```

```ts
// src/constants/index.ts
export enum AsciiDividerVariant {
  Stars = "Stars",
  Diamonds = "Diamonds",
}
```

Why: every use of the enum belongs to the divider itself or consumers that also import the divider. No independent consumer has earned extraction.

## Correct — Component Owns Its Enum, Types and Schema

```tsx
// src/shared/ascii-divider.tsx
import { z } from "zod";

export enum AsciiDividerVariant {
  Stars = "Stars",
  Diamonds = "Diamonds",
}

export const asciiDividerSchema = z.object({ variant: z.enum(AsciiDividerVariant) });
export type AsciiDividerProps = { variant?: AsciiDividerVariant };

export function AsciiDivider({ variant = AsciiDividerVariant.Stars }: AsciiDividerProps) {
  return <div>{variant}</div>;
}
```

```tsx
// consumer
import { AsciiDivider, AsciiDividerVariant, asciiDividerSchema, type AsciiDividerProps } from "@/shared/ascii-divider";

export function Preview() {
  const props: AsciiDividerProps = asciiDividerSchema.parse({ variant: AsciiDividerVariant.Diamonds });
  return <AsciiDivider {...props} />;
}
```

Why: variants, supporting types and schemas remain colocated with their owner until a consumer uses them without the component.

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
