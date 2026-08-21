# Theme and Utility Definition Rule

Tailwind theme namespaces generate broad utility APIs, while CSS variables and custom utilities expose intentional values and treatments. This rule stores project values in `:root`, resets unused defaults, and chooses the narrowest public API for every project-owned design value, including color roles.

- The project MUST reset Tailwind's default theme with `--*: initial` and explicitly define every theme value it uses.
- Every project-owned design value MUST be defined as a CSS variable in `:root`.
- Styling used by only one component MUST stay in that component file as static Tailwind utility classes and MUST NOT be moved to the global stylesheet.
- A set of Tailwind utility classes that two or more components use and should change together MUST become one named custom utility.
- A design value intended to generate a Tailwind utility namespace MUST be mapped from its `:root` CSS variable through `@theme inline`.
- A color reusable across background, text, border, ring, or other CSS properties MUST be registered as a `--color-<role>` Tailwind theme color without a property suffix.
- A CSS variable intended only for a background MUST be named `--<role>-canvas`, and one intended only for readable text MUST be named `--<role>-ink`.
- A property-specific value MUST remain a CSS variable rather than a broad theme namespace. When it is needed outside a custom `@utility`, it MUST be exposed through one matching named `@utility`.
- A repeated combination of canvas, ink, and related styles MUST become a `*-surface` custom Tailwind utility that owns the combination.
- Project-owned style declarations inside `@utility` and unavoidable global selectors MUST use `@apply`.
- A custom utility MUST use Tailwind custom-property or arbitrary-property utility syntax through `@apply` when no named built-in utility represents the property value.
- A custom utility that owns interaction behavior MUST keep its hover, active, focus, and disabled treatments in the same utility block.
- Component markup MUST NOT contain literal arbitrary values in place of missing project tokens or utilities.

## Incorrect — Default Theme Kept and Property-Specific Color Exposed Broadly

```css
@theme {
  --color-header-ink: var(--header-ink);
}
```

```tsx
<h1 className="text-header-ink">Title</h1>
<div className="bg-header-ink" />
```

Why: the default theme remains active, and registering a text-only color in `--color-*` also creates unintended background, border, ring, and other color utilities.

## Correct — Custom Theme and Property-Specific Utility

```css
:root {
  --header-ink: #111827;
  --spacing: 0.25rem;
  --font-body: Inter, sans-serif;
}

@theme {
  --*: initial;
}

@theme inline {
  --spacing: var(--spacing);
  --font-body: var(--font-body);
}

@utility text-header {
  @apply text-(--header-ink);
}
```

```tsx
<h1 className="text-header">Title</h1>
```

Why: only explicitly defined theme values remain available, while the header CSS variable exposes exactly one text utility.

## Incorrect — Runtime Theme Variable Mapped Without `inline`

```css
:root {
  --primary: #7c3aed;
}

.dark {
  --primary: #a78bfa;
}

@theme {
  --color-primary: var(--primary);
}
```

Why: the public token uses runtime variable indirection without the inline mapping intended for selector-driven theme values.

## Correct — Runtime Theme Variable Mapped Inline

```css
:root {
  --primary: #7c3aed;
}

.dark {
  --primary: #a78bfa;
}

@theme inline {
  --color-primary: var(--primary);
}
```

Why: generated color utilities reference the selector-driven runtime value directly.

## Incorrect — Property-Specific Colors Exposed Broadly

```css
@theme {
  --color-primary-canvas: #d87943;
  --color-primary-ink: #ffffff;
}
```

```tsx
<button className="bg-primary-canvas text-primary-ink">Save</button>
<button className="bg-primary-canvas text-primary-ink">Continue</button>
```

Why: property-specific colors are exposed as broad Tailwind colors, and the repeated combination has no named owner.

## Correct — Color Roles Expose Their Intended API

```css
:root {
  --primary-canvas: #d87943;
  --primary-ink: #ffffff;
}

@utility primary-surface {
  @apply bg-(--primary-canvas) text-(--primary-ink);
}
```

```tsx
<button className="primary-surface">Save</button>
```

Why: canvas and ink CSS variables are used only by `primary-surface`, and the repeated combination has one named owner.

## Incorrect — Treatment Split Across Utilities and Raw Declarations

```css
@utility primary-surface {
  background-color: var(--primary-canvas);
}

@utility primary-hover-surface {
  background-color: var(--primary-canvas-hover);
}
```

```tsx
<button className="primary-surface hover:primary-hover-surface">Save</button>
```

Why: the treatment is split across public utilities, its state is reconstructed in markup, and project-owned declarations bypass Tailwind composition.

## Correct — Complete Treatment Composed with `@apply`

```css
@utility primary-surface {
  @apply rounded-md bg-(--primary-canvas) px-3 py-2 text-(--primary-ink);

  &:hover {
    @apply bg-(--primary-canvas-hover);
  }

  &:focus-visible {
    @apply outline-2 outline-(--focus-ring);
  }
}
```

```tsx
<button className="primary-surface">Save</button>
```

Why: the named utility owns the complete treatment and composes every project-owned declaration through Tailwind.
