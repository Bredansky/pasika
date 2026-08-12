# Nameable Visual Concept Rule

Sibling elements that together form a nameable concept but sit unnamed inside a parent become unsearchable as a unit and lose their semantic identity. This rule fixes extraction on the nameable-visual-concept trigger.

- A block of elements SHOULD be extracted as a named component when the elements together form a recognisable, nameable visual concept.

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

Why: the avatar, username, and timestamp together form the message header concept, but they live as unnamed siblings buried inside `FeedView`, so reviewers cannot find them in the file tree.

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

Why: the avatar/username/timestamp group now has a name (`MessageHeader`) and its own file, so reviewers can locate the header unit independently of `FeedView`. `MessageHeader` is exclusive to `FeedView`, so `FeedView` becomes a folder whose barrel exposes only the parent.
