# Folder Nesting Rule

Without nesting, exclusive children can look reusable and their relationship to the parent is easy to miss in review. This rule makes a nested component folder an encapsulation boundary: its barrel exposes only the owner, while internals that gain outside consumers move to the folder their consumers share.

- A component MUST stay flat until it has one or more exclusive child components, then MUST be nested in a folder with the same name.
- A component MUST NOT be nested only because it has support files.
- A nested component's support files MUST live in its folder.
- The nested folder's `index.ts` MUST named-re-export only the nested component; every other file in the folder MUST remain private to that folder, and a file needed by a consumer outside the folder MUST move to the CCF of its consumers.

## Incorrect — Exclusive Children Kept Flat

```text
src/features/blog/
  BlogPage.tsx                # owns exclusive children
  blog-header.tsx             # exclusive child — no sibling needs it
  blog-footer.tsx             # exclusive child — no sibling needs it
  hooks/
    use-blog-filter.ts        # used only by BlogPage
```

Why: `BlogPage` owns children that no sibling uses, but all three files sit as flat siblings. Nothing in the tree shows that `blog-header.tsx` and `blog-footer.tsx` belong to `BlogPage` rather than to any other component in the folder.

## Correct — Exclusive Children Nested

```text
src/features/blog/
  BlogPage/
    index.ts                  # re-exports only BlogPage.tsx
    BlogPage.tsx
    blog-header.tsx           # not re-exported from index.ts
    blog-footer.tsx           # not re-exported from index.ts
    hooks/
      use-blog-filter.ts
```

Why: nesting `BlogPage` into `BlogPage/` makes the parent–child relationship visible in the filesystem, lets the children stay scoped to their concrete consumer, and gives the folder a barrel that re-exports only the nested component.

## Incorrect — Support Files Cause Unnecessary Nesting

```text
src/features/blog/
  BlogPage/
    index.ts
    BlogPage.tsx
    hooks/
      use-blog-filter.ts
```

Why: support files alone do not make `BlogPage` a nested component.

## Correct — Support Files Keep a Component Flat

```text
src/features/blog/
  BlogPage.tsx
  hooks/
    use-blog-filter.ts
```

Why: without exclusive children, `BlogPage` stays flat and its support files remain at the feature scope.

## Incorrect — Exclusive Child Re-Exported

```ts
// src/features/blog/BlogPage/index.ts
export { BlogPage } from "./BlogPage";
export { BlogHeader } from "./blog-header";
```

Why: the barrel exposes `BlogHeader` outside `BlogPage/`, so the nested folder no longer has one public entry point.

## Correct — Only the Nested Component Re-Exported

```tsx
// src/features/blog/BlogPage/index.ts
export { BlogPage } from "./BlogPage";

// src/features/blog/BlogPage/BlogPage.tsx
import { BlogHeader } from "./blog-header";
```

Why: the barrel exposes only the owner component and keeps nested internals behind the folder boundary.

## Incorrect — Nested Child Reused From Outside Its Owner

```tsx
// src/features/blog/blog-list.tsx
import { BlogHeader } from "./BlogPage/blog-header";
```

Why: `blog-list.tsx` reaches inside `BlogPage/`. Once `BlogHeader` has a consumer outside that folder, it belongs at the consumer CCF instead of remaining a nested internal.

## Correct — Reused Child Moved To The Consumer CCF

```text
src/features/blog/
  BlogPage/
    index.ts
    BlogPage.tsx
  blog-header.tsx
  blog-list.tsx
```

```tsx
// src/features/blog/BlogPage/BlogPage.tsx
import { BlogHeader } from "../blog-header";

// src/features/blog/blog-list.tsx
import { BlogHeader } from "./blog-header";
```

Why: the reused component lives at the feature scope shared by both consumers, while `BlogPage/` keeps only files private to its own boundary.
