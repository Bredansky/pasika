# Style Placement Rule

Every reusable style needs one owner. This rule avoids both a global stylesheet full of component recipes and components full of duplicated cross-cutting CSS.

- Single-use component styling MUST stay colocated in the component through utility classes or a local class constant.
- A repeated element-and-content structure MUST become a component instead of a shared class string.
- A reusable behavior or treatment that Tailwind cannot express with built-in utilities SHOULD become a custom utility in the project's stylesheet.
- Global CSS MAY own document-level styles, pseudo-element-heavy effects, third-party selectors, keyframes, and browser-specific selectors.

## Incorrect

```css
/* globals.css */
.settings-save-button {
  display: inline-flex;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}
```

Why: a one-off component recipe is separated from the markup that owns it and creates a global selector to maintain.

## Correct

```tsx
<button className="inline-flex rounded-lg px-3 py-2">Save</button>
```

Why: the local treatment stays with its component, while global CSS remains available for styles that cannot live there.
