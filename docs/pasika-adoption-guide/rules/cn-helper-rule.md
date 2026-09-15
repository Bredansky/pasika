# cn Helper Rule

Class names combine conditionally and conflict with each other. This rule requires the `cn` a module merges them with to come from the framework rather than from a copy of its own.

- A module that merges class names MUST import `cn` from `pasika/cn`.
- A module MUST NOT declare a `cn` of its own.

## Incorrect — A Local Copy Of The Merge

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
```

Why: the module keeps a copy of the helper, so a fix to the framework's merge never reaches this one and two merges drift apart.

## Correct — The Framework's Merge, Imported

```ts
import { cn } from "pasika/cn";

export function Button({ className }: ButtonProps) {
  return <button className={cn("px-2 py-1", className)} />;
}
```

Why: class names resolve through the one helper the framework maintains, and the module declares none of its own.
