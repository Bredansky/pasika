# Accessible Interaction Rule

Clickable surfaces must remain usable with a keyboard, including when they are styled as cards or other non-native controls.

- A clickable non-interactive JSX surface MUST support keyboard and focus interaction.

## Incorrect — Mouse-Only Selection

```tsx
function PreviewCard({ select }: { select: () => void }) {
  return <article onClick={select}>Preview</article>;
}
```

Why: the article is not a keyboard-operable control, so users cannot focus and activate it reliably.

## Correct — Native Interactive Control

```tsx
function PreviewCard({ select }: { select: () => void }) {
  return (
    <button type="button" onClick={select}>
      Select preview
    </button>
  );
}
```

Why: a native button supplies focus and keyboard activation without custom role or key handling.
