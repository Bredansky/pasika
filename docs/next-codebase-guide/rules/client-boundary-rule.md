# Client Boundary Rule

Next.js App Router pages are Server Components by default. This rule keeps `"use client"` directives necessary and prevents server-only code from entering client dependency graphs.

- An App Router file MUST declare `"use client"` as its first directive if it is `error.tsx` or `global-error.tsx`, and MUST NOT declare it otherwise unless it or its imports require client-only features ([Next.js error file convention](https://nextjs.org/docs/app/api-reference/file-conventions/error)).
- A Server Component MUST NOT use client-only React hooks, JSX event handlers, or browser-only APIs in its own file or through imported modules unless the client-only code is behind a `"use client"` boundary ([Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)).
- A file imported only by code already behind a `"use client"` boundary MUST NOT repeat the directive ([Next.js use client](https://nextjs.org/docs/app/api-reference/directives/use-client)).
- A Client Component MUST NOT depend on a server-only module, directly or through any runtime imports, re-exports, dynamic imports, or `require()` ([Next.js environment poisoning guidance](https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning)).
- A shared `constants/`, `types/`, or `schemas/` `index.ts` barrel (including indexed subgroups) MUST NOT have a transitive runtime dependency on server-only modules.
- A support-folder `server.ts` MUST import `server-only` to prevent client-side imports at build time ([Next.js documentation](https://nextjs.org/docs/app/getting-started/server-and-client-components#preventing-environment-poisoning)).
- A module importing `"server-only"` MUST place its side-effect marker before every other import declaration.

## Incorrect — Interactive Component Without a Boundary

```tsx
// src/features/posts/like-button.tsx
export function LikeButton() {
  return <button onClick={() => alert("Liked")}>Like</button>;
}
```

Why: JSX event handlers require a client boundary.

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
```

```tsx
// src/features/posts/like-icon.tsx
"use client";

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

## Incorrect — Hidden Server Dependency Through a Shared Barrel

```tsx
// src/constants/stream-api-contracts.ts
import "server-only";
export const streamYouTubeLiveApiContract = {} as const;
```

```ts
// src/constants/index.ts
export * from "./stream-api-contracts";
```

```tsx
// src/features/stream/stream-widget.tsx
"use client";

import { streamYouTubeLiveApiContract } from "@/constants";
```

Why: a Client Component reaches a server-only dependency through a shared barrel. The ESLint rule reports the complete runtime import chain.

## Correct — Separate Support Entry Points

```ts
// src/constants/index.ts — shared, client-safe
export * from "./api-route-paths";
```

```ts
// src/constants/server.ts — server-only
import "server-only";
export * from "./stream-api-contracts";
```

```ts
// src/app/api/stream-status/route.ts — server consumer
import { streamYouTubeLiveApiContract } from "@/constants/server";
```

Why: shared imports remain safe for the client, while server code uses the guarded server entry point.

## Incorrect — Server-Only Marker After An Import

```ts
// src/utils/fresh-video.ts
import { zodFetch } from "pasika/zod-fetch";
import "server-only";
```

Why: the module's server boundary is obscured by ordinary imports.

## Correct — Server-Only Marker First

```ts
// src/utils/fresh-video.ts
import "server-only";

import { zodFetch } from "pasika/zod-fetch";
```

Why: the marker appears first and a blank line visually separates the server boundary from ordinary imports. This is a readability convention and does not strengthen runtime protection.
