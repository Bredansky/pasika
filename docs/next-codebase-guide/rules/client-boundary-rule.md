# Client Boundary Rule

Next.js App Router pages are Server Components by default, but interactive code needs a client boundary. This rule avoids missing and unnecessary `"use client"` directives.

- An App Router file MUST declare `"use client"` as its first directive if it is `error.tsx` or `global-error.tsx`, and MUST NOT declare it otherwise unless it or its imports require client-only features ([Next.js error file convention](https://nextjs.org/docs/app/api-reference/file-conventions/error)).
- A Server Component MUST NOT use client-only React hooks, JSX event handlers, or browser-only APIs in its own file or through imported modules unless the client-only code is behind a `"use client"` boundary.
- A file imported only by code already behind a `"use client"` boundary MUST NOT repeat the directive.
- A Client Component MUST NOT depend on a server-only module, directly or through any runtime imports, re-exports, dynamic imports, or `require()`.
- A shared `constants/`, `types/`, or `schemas/` `index.ts` barrel (including indexed subgroups) MUST NOT have a transitive runtime dependency on server-only modules.
- Any `*.server.ts`, `*.server.tsx`, or `server.ts` module is server-only, as is a module importing `server-only`. A support-folder `server.ts` MUST import `server-only` so Next.js enforces the separation during compilation too.
- `constants/`, `types/`, and `schemas/` MAY provide an optional `server.ts` entry. Consumers outside the folder MUST use it instead of directly importing server-only support modules. Non-barrel folders such as `utils/` use direct imports, with the same transitive safety checks.
- Type-only imports and re-exports MAY reference server-only types without creating a browser runtime dependency. A shared runtime schema or API contract is **not** server-only just because a route handler uses it.
- Large shared contracts MAY be loaded from independent runtime entry points with `import()`; a production build MUST verify the resulting client bundle sizes.

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

## Incorrect — Hidden server dependency through a shared barrel

```tsx
// src/constants/index.ts
export * from "./stream-api-contracts.server";

// src/features/stream/stream-widget.tsx
("use client");

import { streamYouTubeLiveApiContract } from "@/constants";
```

Why: a Client Component reaches a server-only dependency through a shared barrel. The ESLint rule reports the complete runtime import chain.

## Correct — Separate support entry points

```ts
// src/constants/index.ts — shared, client-safe
export * from "./api-route-paths";

// src/constants/server.ts — server-only
import "server-only";
export * from "./stream-api-contracts.server";

// src/app/api/stream-status/route.ts — server consumer
import { streamYouTubeLiveApiContract } from "@/constants/server";
```

Why: shared imports remain safe for the client, while server code uses the guarded server entry point.
