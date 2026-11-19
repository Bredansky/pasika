# Accessible Interaction Rule

When an element handles clicks, users must also be able to reach and activate it with a keyboard. Prefer native interactive elements for actions and links.

- A clickable non-interactive JSX surface MUST support keyboard and focus interaction.

## Incorrect — Click Handler on a Non-Interactive Card

```tsx
function PreviewCard({ select }: { select: () => void }) {
  return <article onClick={select}>Select preview</article>;
}
```

Why: `article` groups content; it is not an interactive control. Clicking works with a mouse, but the card cannot be focused or activated with Enter or Space.

## Correct — Button Inside the Card

```tsx
function PreviewCard({ select }: { select: () => void }) {
  return (
    <article>
      <button type="button" onClick={select}>
        Select preview
      </button>
    </article>
  );
}
```

Why: the card keeps its `article` semantics, while the `button` provides keyboard focus and Enter/Space activation automatically. For navigation, use an `a` element with an `href` instead. Avoid adding `role`, `tabIndex`, and keyboard handlers to a non-interactive element when a native control works.
