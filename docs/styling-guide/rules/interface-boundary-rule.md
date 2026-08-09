# Interface Boundary Rule

Application chrome must remain themeable, while artwork, user content, and faithful external visual reproductions often need their own color data. This rule keeps that boundary intentional.

- Application chrome MUST use semantic theme tokens and the repository's readable background/foreground pairs.
- Components MUST NOT use palette utilities or literal colors for ordinary navigation, forms, dialogs, controls, status feedback, or focus treatment when semantic roles exist.
- A new semantic token MUST represent a recurring interface meaning that existing roles cannot express.
- Content, artwork, user-selected media, data visualization, and faithful third-party visual reproductions MAY use literal colors when color is part of the content itself.
- Opacity modifiers SHOULD express interaction and layering states without creating a new semantic token.

## Incorrect

```tsx
<Button className="bg-purple-600 text-white hover:bg-purple-500">Save</Button>
<input className="border-[#6b7280] focus:ring-[#7c3aed]" />
```

Why: ordinary controls are tied to a palette instead of the repository's semantic action, border, and focus roles.

## Correct

```tsx
<Button className="bg-primary text-primary-foreground hover:bg-primary/90">Save</Button>
<input className="border-border focus-visible:ring-ring/50" />

// A product preview preserves the external brand's actual color.
<div className="bg-[#1db954]" />
```

Why: application controls inherit the active theme while the external visual keeps the color that defines its content.
