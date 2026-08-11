# Style Placement Rule

Every project-owned style needs one implementation owner. This rule decides whether styling belongs beside component markup, in a named custom utility, or behind an unavoidable global selector.

- Single-use component styling MUST stay colocated in the component through Tailwind utility classes or a local class constant.
- A reusable behavior or treatment that has a stable design meaning MUST become a named custom utility.
- A third-party selector, rich-content selector, document-state selector, browser selector, or pseudo-element-heavy effect that controlled JSX cannot own MAY use an unavoidable global selector.
- An unavoidable global selector MUST compose project-owned declarations with `@apply`.
- Component recipes MUST NOT become global selectors merely to shorten markup.
- Literal arbitrary values MUST NOT replace missing project tokens or named utilities in component markup.

## Incorrect

```css
/* globals.css */
.settings-save-button {
  @apply inline-flex rounded-lg px-3 py-2;
}
```

Why: a one-off component recipe is separated from the markup that owns it and creates a global selector to maintain.

## Correct

```tsx
<button className="inline-flex rounded-lg px-3 py-2">Save</button>
```

Why: the local treatment stays with its component, while global selectors remain reserved for markup or browser behavior that controlled JSX cannot own.

## Incorrect — Raw Declarations in an Unavoidable Selector

```css
.external-player .controls {
  display: none;
}
```

Why: third-party markup justifies the global selector, but the project-owned declaration still bypasses Tailwind composition.

## Correct — Global Selector Uses `@apply`

```css
.external-player .controls {
  @apply hidden;
}
```

Why: the global selector owns an unavoidable third-party boundary while its declaration stays inside the project's Tailwind system.
