# Inline Style Rule

Static styling belongs in Tailwind. Inline styles are for values that come from runtime data.

- Components MUST use Tailwind for static styling; inline styles MAY be used for runtime-sourced values.

## Incorrect — Static Inline Typography

```tsx
<CardTitle style={{ fontSize: "0.875rem", fontWeight: 500 }}>Account</CardTitle>
```

Why: both values are static styling decisions that belong in Tailwind.

## Correct — Tailwind Typography

```tsx
<CardTitle className="text-sm font-medium">Account</CardTitle>
```

Why: the static typography stays in the project's Tailwind API.

## Incorrect — Runtime Values Forced Into Dynamic Classes

```tsx
<button className={`bg-[${buttonColor}] text-[${textColor}]`}>Save</button>
```

Why: runtime-generated class strings are not a reliable source for Tailwind's static class discovery.

## Correct — Runtime Values Kept Inline

```tsx
<button style={{ backgroundColor: buttonColor, color: textColor }}>Save</button>
```

Why: the values come from runtime data rather than static styling.

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

Why: the runtime value stays dynamic while the browser-facing property is expressed through Tailwind.

## Incorrect — Static Complex Value Kept Inline

```tsx
<div style={{ gridTemplateColumns: "2fr max(0, var(--gutter-width)) calc(var(--gutter-width) + 10px)" }} />
```

Why: the value is static, so it belongs in Tailwind even though it is complex.

## Correct — Static Complex Value Uses a Named Utility

```css
@utility content-grid {
  grid-template-columns: 2fr max(0, var(--gutter-width)) calc(var(--gutter-width) + 10px);
}
```

```tsx
<div className="content-grid" />
```

Why: the static value stays in Tailwind and has a searchable project-specific name.
