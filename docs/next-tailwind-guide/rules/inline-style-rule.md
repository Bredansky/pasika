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

## Incorrect — Runtime Values Forced Into Dynamic Classes

```tsx
<button className={`bg-[${buttonColor}] text-[${textColor}]`}>Save</button>
```

Why: runtime-generated class strings are not a reliable source for Tailwind's static class discovery.

## Correct — Runtime Values Kept Inline

```tsx
<button style={{ backgroundColor: buttonColor, color: textColor }}>Save</button>
```

Why: the values come from runtime data, so keeping them inline preserves the data-driven styling decision.

## Incorrect — Runtime Value Interpolated Into an Arbitrary Utility

```tsx
<button className={`bg-[${buttonColor}]`}>Save</button>
```

Why: the runtime value is hidden inside a class string that Tailwind cannot statically discover.

## Correct — Runtime CSS Variable Bridged Into a Utility

```tsx
<button style={{ "--bg-color": buttonColor }} className="bg-(--bg-color)">
  Save
</button>
```

Why: the runtime value stays dynamic while the browser-facing property is still expressed through a utility.

## Incorrect — Complicated Value Forced Into a Class

```tsx
<div className="grid-cols-[2fr_max(0,var(--gutter-width))_calc(var(--gutter-width)+10px)]" />
```

Why: the class is harder to read than the CSS value it is trying to encode.

## Correct — Complicated Value Kept Inline

```tsx
<div style={{ gridTemplateColumns: "2fr max(0, var(--gutter-width)) calc(var(--gutter-width) + 10px)" }} />
```

Why: the complicated value stays readable as CSS instead of becoming an opaque class string.

## Incorrect — ImageResponse Styled With Browser Utility Assumptions

```tsx
return new ImageResponse(<div className="flex size-full">Preview</div>);
```

Why: `ImageResponse` renders through Satori/Resvg rather than the browser's Tailwind stylesheet.

## Correct — ImageResponse Uses Its Inline CSS API

```tsx
return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%" }}>Preview</div>);
```

Why: the image renderer receives the CSS directly in the JSX tree it renders.
