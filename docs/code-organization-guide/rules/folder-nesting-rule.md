# Folder Nesting Rule

Without nesting, exclusive children can look reusable and their relationship to the parent is easy to miss in review. This rule groups them with their parent and keeps them private to that folder.

- A flat component MUST be nested in a folder with the same name when it gains one or more exclusive children that no sibling needs.
- A component MUST NOT be nested only because it has support files.
- A nested component's support files MUST live in its folder.
- The nested folder's `index.ts` MUST named-re-export the nested component and MUST NOT re-export its exclusive children.

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
    blog-header.tsx           # reachable only via its concrete consumer
    blog-footer.tsx           # reachable only via its concrete consumer
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

Why: the barrel re-exports the child as well as the nested component, so outside consumers can import `blog-header.tsx` through `index.ts` and the child stops being exclusive to `BlogPage`.

## Correct — Only the Nested Component Re-Exported

```tsx
// src/features/blog/BlogPage/index.ts
export { BlogPage } from "./BlogPage";

// src/features/blog/BlogPage/BlogPage.tsx
import { BlogHeader } from "./blog-header";
```

Why: the barrel exposes only the nested component, so the child stays private to the folder and is imported by path from its concrete consumer.
