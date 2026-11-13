# Client Boundary Rule

React Server Components use module imports to determine which code runs on the server and which code belongs to the client. This rule keeps Next.js client entry points intentional without duplicating directives on their transitive dependencies.

- A Next.js App Router `error.tsx` or `global-error.tsx` file MUST declare `"use client"` as its first directive ([Next.js error file convention](https://nextjs.org/docs/app/api-reference/file-conventions/error)).
- A Server Component MUST NOT use client-only React hooks, JSX event handlers, or browser-only APIs in its own file or through imported modules unless the client-only code is behind a `"use client"` boundary.
- A module with at least one runtime consumer MUST NOT repeat the `"use client"` directive when every consumer is inside an existing client dependency graph and no server entry reaches the module.
- A non-error-boundary App Router entry or internally consumed module MUST NOT declare `"use client"` when neither it nor its runtime dependencies require client-only execution.

## Incorrect — Event Handler in a Server Module

```tsx
// src/app/page.tsx
import { LikeButton } from "@/features/posts/like-button";

export default function Page() {
  return <LikeButton />;
}

// src/features/posts/like-button.tsx
export function LikeButton() {
  return <button onClick={() => alert("Liked")}>Like</button>;
}
```

Why: the button is reached from a server entry point without a client boundary, but its click handler needs browser-side execution.

## Correct — Client Boundary at the Interactive Leaf

```tsx
// src/app/page.tsx
import { LikeButton } from "@/features/posts/like-button";

export default function Page() {
  return <LikeButton />;
}

// src/features/posts/like-button.tsx
("use client");

export function LikeButton() {
  return <button onClick={() => alert("Liked")}>Like</button>;
}
```

Why: the interactive component is an explicit client entry point while the page remains server-rendered.

## Incorrect — Nested Directive Duplicated

```tsx
// src/features/posts/like-button.tsx
"use client";

import { LikeIcon } from "./like-icon";

export function LikeButton() {
  return (
    <button onClick={() => alert("Liked")}>
      <LikeIcon />
    </button>
  );
}

// src/features/posts/like-icon.tsx
("use client");

export function LikeIcon() {
  return <svg aria-hidden="true" />;
}
```

Why: `LikeIcon` already belongs to the client graph through its parent import.

## Correct — Nested Component Inherits Client Execution

```tsx
// src/features/posts/like-button.tsx
"use client";

import { LikeIcon } from "./like-icon";

export function LikeButton() {
  return (
    <button onClick={() => alert("Liked")}>
      <LikeIcon />
    </button>
  );
}

// src/features/posts/like-icon.tsx
export function LikeIcon() {
  return <svg aria-hidden="true" />;
}
```

Why: modules imported by a client entry inherit client execution without another directive.

## Incorrect — Presentation-Only Boundary

```tsx
// src/features/posts/post-count.tsx
"use client";

export function PostCount({ count }: { count: number }) {
  return <span>{count}</span>;
}
```

Why: the component can render on the server and has no client-only dependency.

## Correct — Server-Compatible Presentation

```tsx
// src/features/posts/post-count.tsx
export function PostCount({ count }: { count: number }) {
  return <span>{count}</span>;
}
```

Why: a presentation-only component stays compatible with server rendering and can still be imported by client entry points.

## Incorrect — Next.js Error Boundary Without a Directive

```tsx
// src/app/error.tsx
export default function Error() {
  return <p>Something went wrong</p>;
}
```

Why: an App Router error file is a client entry even when it contains no hooks of its own.

## Correct — Next.js Error Boundary with a Directive

```tsx
// src/app/error.tsx
"use client";

export default function Error() {
  return <p>Something went wrong</p>;
}
```

Why: the framework's error boundary is explicitly marked as client code.
