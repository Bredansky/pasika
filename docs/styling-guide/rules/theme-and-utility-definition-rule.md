# Theme and Utility Definition Rule

CSS-first Tailwind projects can expose values through generated theme utilities or through a custom utility. This rule keeps the public utility API intentional instead of generating unused combinations or splitting one treatment across components.

- A value MUST be defined through `@theme` when its generated utility namespace is useful across the CSS properties Tailwind exposes.
- A value MUST be defined through `@utility` when it belongs to one property, has no matching theme namespace, or represents a multi-property treatment.
- A custom utility that owns interaction behavior MUST keep its hover, active, focus, and disabled states in the same utility block.
- Custom utilities SHOULD use `@apply` for existing Tailwind utilities when doing so makes the treatment clearer.
- Components MAY combine ordinary Tailwind utilities directly when the combination is local and has no repeated design meaning.

## Incorrect

```css
@theme {
  --color-header-ink: var(--header-ink);
}

@utility surface-primary {
  background-color: var(--primary-canvas);
}

@utility surface-primary-hover {
  background-color: var(--primary-canvas-hover);
}
```

```tsx
<button className="surface-primary hover:surface-primary-hover">Save</button>
```

Why: the first token creates background and border utilities that the header text never uses, while the button has to assemble one treatment and its state from separate utilities.

## Correct

```css
@theme {
  --color-primary: var(--primary);
}

@utility text-header {
  color: var(--header-ink);
}

@utility surface-primary {
  @apply rounded-md px-3 py-2;
  background-color: var(--primary-canvas);
  color: var(--primary-ink);

  &:hover {
    background-color: var(--primary-canvas-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring);
  }
}
```

```tsx
<button className="surface-primary">Save</button>
```

Why: broadly useful primary colors receive normal Tailwind utilities, header text exposes only its intended property, and the surface treatment keeps its behavior together.
