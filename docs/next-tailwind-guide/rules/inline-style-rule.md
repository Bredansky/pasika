# Inline Style Rule

Simple static CSS in browser-rendered JSX bypasses Tailwind's utility and token system, while inline styles are still useful for values that are genuinely dynamic or too complex to read well as class names. Non-browser JSX renderers such as Next.js `ImageResponse` use CSS directly and are outside this browser-styling rule.

- Browser-rendered components MUST use Tailwind utilities, theme tokens, or named custom utilities for simple static project styling instead of JSX `style` attributes; inline styles MAY be used for runtime-sourced values, CSS custom properties set from runtime data, or complicated arbitrary values that are difficult to read as class names.

## Incorrect — Simple Static Inline Typography

```tsx
<CardTitle style={{ fontSize: "0.875rem", fontWeight: 500 }}>Account</CardTitle>
```

Why: both values are simple static design choices that already have readable utility representations.

## Correct — Named Tailwind Utilities

```tsx
<CardTitle className="text-sm font-medium">Account</CardTitle>
```

Why: the static typography stays in the project's utility API.

## Inline Styles for Runtime Values

```tsx
<button style={{ backgroundColor: buttonColor, color: textColor }}>Save</button>
```

Values supplied at runtime can remain inline because no static class can encode data that is not known at build time.

## Inline Styles for Dynamic CSS Variables

```tsx
<button style={{ "--bg-color": buttonColor }} className="bg-(--bg-color)">
  Save
</button>
```

A runtime value can be passed through a CSS custom property and consumed by a utility class.

## Inline Styles for Complicated Values

```tsx
<div style={{ gridTemplateColumns: "2fr max(0, var(--gutter-width)) calc(var(--gutter-width) + 10px)" }} />
```

A complicated value may stay inline when spelling it as a class would make the markup harder to read.

## Non-Browser Image Rendering

```tsx
return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%" }}>Preview</div>);
```

`ImageResponse` renders JSX through Satori/Resvg instead of the browser, so its CSS stays inline and is not governed by this browser-styling rule.
