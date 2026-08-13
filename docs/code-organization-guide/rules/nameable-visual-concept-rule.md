# Nameable Visual Concept Rule

Some groups of elements form a clear visual unit but have no name in the file tree. This rule recommends extracting those groups into descriptive components.

- A block of elements SHOULD be extracted to a component with a descriptive name when it forms a recognizable visual unit.

## Incorrect — Nameable Visual Block Kept Inline

```tsx
// src/features/feed/feed-view.tsx
export function FeedView(): React.JSX.Element {
  return (
    <main>
      <article>
        <Avatar />
        <UserName />
        <PostTimestamp />
        <PostBody />
      </article>
    </main>
  );
}
```

Why: the avatar, username, and timestamp form a message header but remain inline in `FeedView`.

## Correct — Nameable Visual Block Extracted

```text
src/features/feed/
  feed-view/
    index.ts                  # re-exports only feed-view.tsx
    feed-view.tsx
    message-header.tsx        # exclusive child — imported directly by feed-view.tsx
```

```tsx
// src/features/feed/feed-view/feed-view.tsx
import { MessageHeader } from "./message-header";

export function FeedView(): React.JSX.Element {
  return (
    <main>
      <article>
        <MessageHeader />
        <PostBody />
      </article>
    </main>
  );
}
```

```tsx
// src/features/feed/feed-view/message-header.tsx
export function MessageHeader(): React.JSX.Element {
  return (
    <header>
      <Avatar />
      <UserName />
      <PostTimestamp />
    </header>
  );
}
```

Why: `MessageHeader` gives the group a clear name and its own file, while `FeedView` only composes it.
