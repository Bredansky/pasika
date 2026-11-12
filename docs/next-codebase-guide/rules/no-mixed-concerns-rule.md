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

## Incorrect — Extracting Component-Only CVA Variants

```ts
// src/constants/index.ts
import { cva } from "class-variance-authority";

export enum ButtonTone {
  Primary = "primary",
  Secondary = "secondary",
}

export const buttonVariants = cva("inline-flex items-center rounded", {
  variants: {
    tone: {
      [ButtonTone.Primary]: "bg-primary-canvas text-primary-ink",
      [ButtonTone.Secondary]: "bg-muted-canvas text-muted-ink",
    },
  },
  defaultVariants: { tone: ButtonTone.Primary },
});
```

```tsx
// src/shared/button.tsx
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/constants";
import { cn } from "@/utils/cn";

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ tone, className, ...props }: ButtonProps): React.JSX.Element {
  return <button className={cn(buttonVariants({ tone }), className)} {...props} />;
}
```

Why: `buttonVariants` and `ButtonTone` belong to `Button` and its consumers, so extracting them into `constants/` creates an unnecessary second owner.

## Correct — Keep CVA Variants With Their Component

```tsx
// src/shared/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

export enum ButtonTone {
  Primary = "primary",
  Secondary = "secondary",
}

export const buttonVariants = cva("inline-flex items-center rounded", {
  variants: {
    tone: {
      [ButtonTone.Primary]: "bg-primary-canvas text-primary-ink",
      [ButtonTone.Secondary]: "bg-muted-canvas text-muted-ink",
    },
  },
  defaultVariants: { tone: ButtonTone.Primary },
});

type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>;

export function Button({ tone, className, ...props }: ButtonProps): React.JSX.Element {
  return <button className={cn(buttonVariants({ tone }), className)} {...props} />;
}
```

```tsx
// src/features/profile/profile-actions.tsx
import { Button, ButtonTone, buttonVariants } from "@/shared/button";

export function ProfileActions(): React.JSX.Element {
  return (
    <div>
      <Button tone={ButtonTone.Primary}>Save</Button>
      <a href="/help" className={buttonVariants({ tone: ButtonTone.Secondary })}>
        Help
      </a>
    </div>
  );
}
```

Why: CVA and its enum remain with `Button`, while consumers that also import `Button` may reuse the exported styling API.
