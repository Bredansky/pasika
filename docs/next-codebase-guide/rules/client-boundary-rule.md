# Client Boundary Rule

Next.js App Router pages are Server Components by default, but interactive code needs a client boundary. This rule avoids missing and unnecessary `"use client"` directives.

- A Next.js App Router `error.tsx` or `global-error.tsx` file MUST declare `"use client"` as its first directive ([Next.js error file convention](https://nextjs.org/docs/app/api-reference/file-conventions/error)).
- A Server Component MUST NOT use client-only React hooks, JSX event handlers, or browser-only APIs in its own file or through imported modules unless the client-only code is behind a `"use client"` boundary.
- A file imported only by code already behind a `"use client"` boundary MUST NOT repeat the directive.
- A page or other file used by the App Router MUST NOT declare `"use client"` if it and its imports do not need client-only features, except `error.tsx` and `global-error.tsx`.

## Incorrect — Interactive Component Without a Boundary

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

Why: the server page imports a button that needs browser-side event handling, but the button has no client boundary.

## Correct — Interactive Component Declares a Boundary

```tsx
// src/features/posts/like-button.tsx
"use client";

export function LikeButton() {
  return <button onClick={() => alert("Liked")}>Like</button>;
}
```

Why: the button is a client entry point while the page stays a Server Component.

## Incorrect — Imported File Repeats a Boundary

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

Why: `LikeIcon` is used only by a component that already has a client boundary.

## Correct — Only the Entry Point Declares a Boundary

```tsx
// src/features/posts/like-icon.tsx
export function LikeIcon() {
  return <svg aria-hidden="true" />;
}
```

Why: the importing `LikeButton` already provides the client boundary.

## Incorrect — Static Page Declares a Boundary

```tsx
// src/app/page.tsx
"use client";

export default function Page() {
  return <h1>Posts</h1>;
}
```

Why: this page does not need client-only features.

## Correct — Static Page Stays Server-Compatible

```tsx
// src/app/page.tsx
export default function Page() {
  return <h1>Posts</h1>;
}
```

Why: static content works without a client boundary.

## Incorrect — Error File Lacks a Boundary

```tsx
// src/app/error.tsx
export default function Error() {
  return <p>Something went wrong</p>;
}
```

Why: Next.js requires error files to be Client Components, even when they render only static content.

## Correct — Error File Declares a Boundary

```tsx
// src/app/error.tsx
"use client";

export default function Error() {
  return <p>Something went wrong</p>;
}
```

Why: the error boundary has the directive Next.js requires.
