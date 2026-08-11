# Theme Token Rule

Application chrome must remain themeable, while artwork, user content, data, and faithful external visuals may carry color as content. This rule gives shared interface decisions semantic names without turning content colors into interface tokens.

- Application chrome MUST use semantic project tokens and readable canvas/ink pairs.
- Shared interface colors, surfaces, borders, typography roles, and reusable measurements MUST use semantic project tokens.
- Components MUST NOT use palette utilities or literal colors for ordinary navigation, forms, dialogs, controls, status feedback, or focus treatment when a semantic role exists.
- A new semantic token MUST represent a recurring interface meaning that existing roles cannot express.
- Token names SHOULD describe purpose rather than a palette value or one component's implementation.
- Content, artwork, user-selected media, data visualization, and faithful third-party visual reproductions MAY use literal colors when color is part of the content itself.
- Opacity modifiers SHOULD express interaction and layering differences without creating a new semantic token.

## Incorrect

```tsx
<Button className="bg-purple-600 text-white hover:bg-purple-500">Save</Button>
<input className="border-[#6b7280] focus:ring-[#7c3aed]" />
```

Why: ordinary controls are tied to palette and literal values instead of the project's semantic action, canvas, ink, border, and focus roles.

## Correct

```tsx
<Button tone="primary">Save</Button>
<input className="border-border focus-visible:ring-focus/50" />

// A product preview preserves the external brand color as content.
<ProductPreview brandColor="#1db954" />
```

Why: ordinary interface styling uses the component API and semantic roles, while the faithful external visual retains the content color that defines it.
