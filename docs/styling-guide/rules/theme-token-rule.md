# Theme Token Rule

Theme tokens give shared interface decisions stable semantic names, allowing a theme to change without every component changing with it. This rule separates interface design from artwork and runtime data.

- Shared interface colors, surfaces, borders, typography roles, and reusable measurements MUST use semantic theme tokens.
- Components MUST NOT use literal interface colors when a semantic token represents the intended role.
- Token names SHOULD describe purpose rather than a palette value or one component's implementation.
- Literal values MAY be used for artwork, user-generated content, data visualization, third-party content, or a runtime fallback that cannot consume theme tokens.

## Incorrect

```tsx
<button className="bg-purple-600 text-white hover:bg-purple-500">Save</button>
```

Why: the action's role is tied to a particular palette rather than the theme's primary-action treatment.

## Correct

```tsx
<button className="bg-primary text-primary-foreground hover:bg-primary/90">Save</button>
```

Why: the button describes its interface role, leaving the theme responsible for the actual palette.
