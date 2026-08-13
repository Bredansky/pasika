# Folder Nesting Rule

Without nesting, exclusive children can look reusable and their relationship to the parent is easy to miss in review. This rule groups them with their parent and keeps them private to that folder.

- A flat component MUST be nested in a folder with the same name when it gains one or more exclusive children that no sibling needs.
- Support files alone MUST NOT cause a component to be nested.
- A nested component's private support files MUST live in its folder.
- The nested folder's `index.ts` MUST named-re-export the nested component and MUST NOT re-export its exclusive children.

## Incorrect — Exclusive Children Kept Flat

```text
src/features/blog/
  BlogPage.tsx                # owns exclusive children
  blog-header.tsx             # exclusive child — no sibling needs it
  blog-footer.tsx             # exclusive child — no sibling needs it
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
    hooks/                    # private support files
```

Why: nesting `BlogPage` into `BlogPage/` makes the parent–child relationship visible in the filesystem, lets the children stay scoped to their concrete consumer, and gives the folder a barrel that re-exports only the nested component.

## Incorrect — Child Re-Exported from the Folder

```text
src/features/blog/
  BlogPage/
    index.ts                  # re-exports BlogPage.tsx and blog-header.tsx
    BlogPage.tsx
    blog-header.tsx
```

Why: the barrel re-exports the child as well as the nested component, so outside consumers can import `blog-header.tsx` through `index.ts` and the child stops being exclusive to `BlogPage`.

## Correct — Only the Parent Re-Exported

```text
src/features/blog/
  BlogPage/
    index.ts                  # re-exports only BlogPage.tsx
    BlogPage.tsx
    blog-header.tsx           # imported directly by BlogPage.tsx
```

Why: the barrel exposes only the nested component, so the child stays private to the folder and is imported by path from its concrete consumer.
