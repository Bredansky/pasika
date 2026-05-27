# Tailwind

## Color utilities

Use theme tokens for Tailwind color utilities in the app interface. Tokens represent UI roles, not matching color values. Use the same token only when styles should change together with the theme.

When choosing or adding app theme tokens, follow the active theme profile, such as the shadcn theme profile.

Raw color values should not appear in app interface classes. User-selected colors for exported/story/canvas/media content are data and may stay raw.

Opacity modifiers on token utilities are OK for interaction states: `hover:bg-primary/90`, `outline-ring/50`.

## When to use @utility

Use `@utility` when Tailwind has no built-in class for the behaviour you need:

```css
/* Multi-property transition not covered by Tailwind */
@utility transition-border-shadow {
  transition-property: border-color, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
```

Never use raw CSS on component elements. If Tailwind doesn't cover it, add a `@utility`.

## Decision checklist

1. Is this app interface color styling? Use the active theme profile's role tokens.
2. Is this exported/user-created content color? Treat it as data, not a theme token.
3. Is the variation just an interaction state? Opacity modifiers on token utilities are OK.
4. Does Tailwind lack the CSS behaviour you need? Add `@utility` to `globals.css`.
