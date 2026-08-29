# cn Helper Rule

Class names combine conditionally and conflict with each other. This rule requires the repository's `cn` helper to resolve those conflicts by merging `clsx` and `tailwind-merge`.

- A repository MUST define its `cn` helper by merging `clsx` and `tailwind-merge`.

## Incorrect — Concatenation Without Conflict Resolution

```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
```

Why: joining classes keeps both `px-2` and `px-4` in the output, so the last-declared utility silently wins and variant overrides are unreliable.

## Correct — Merging clsx and tailwind-merge

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
```

Why: `clsx` builds the conditional class string and `twMerge` removes conflicting utilities, so a later variant reliably overrides an earlier one.
