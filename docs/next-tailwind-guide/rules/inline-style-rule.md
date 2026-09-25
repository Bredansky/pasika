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
