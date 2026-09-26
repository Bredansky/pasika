# Smart vs Dumb Component Rule

Without a file-name convention, a component's smart vs dumb ownership is invisible to reviewers from the tree alone. Without a stable component marker, meaningful React boundaries are harder to identify in the rendered DOM.

- A component's name MUST be `PascalCase`.
- A smart component file name MUST be `PascalCase.tsx`.
- A dumb component file name MUST be `kebab-case.tsx`.
- A smart component MUST expose exactly one stable `data-component` marker for itself in every rendered result, and its value MUST match the component name in `PascalCase`; markers that belong to nested components do not count toward this requirement.
- A component's `data-component` marker MUST live only on its existing meaningful DOM surface, and the component MUST NOT add additional `data-component` markers to its descendants on its own behalf.
- If a smart component's meaningful DOM surface is rendered by a child component, it MUST pass `data-component` to that child and the child MUST forward the prop; the smart component MUST NOT add an otherwise unnecessary DOM wrapper only to host `data-component`.
- A dumb component MAY expose one `data-component` marker on its meaningful DOM surface, and when present its value MUST be `kebab-case`.
- [Next.js App Router routing files](https://nextjs.org/docs/app/getting-started/project-structure#routing-files) MUST use their required kebab-case names and are exempt from smart/dumb file-name and `data-component` requirements.

## Incorrect — Smart Component Uses a Dumb File Name

```tsx
// src/features/social/social-stats-panel.tsx
import { zodFetch } from "pasika/zod-fetch";
import { socialStatsResponseSchema } from "./schemas";
import { PlatformCard } from "./platform-card";

export async function SocialStatsPanel(): Promise<React.JSX.Element> {
  const stats = await zodFetch({
    url: "/api/social-stats",
    responseSchema: socialStatsResponseSchema,
  });

  return (
    <div data-component="SocialStatsPanel">
      {stats.map((stat) => (
        <PlatformCard key={stat.platform} data={stat} />
      ))}
    </div>
  );
}
```

Why: fetching data makes the component smart, but the file name uses dumb-component casing.

## Correct — Smart Component Uses a Smart File Name

```tsx
// src/features/social/SocialStatsPanel.tsx
import { zodFetch } from "pasika/zod-fetch";
import { socialStatsResponseSchema } from "./schemas";
import { PlatformCard } from "./platform-card";

export async function SocialStatsPanel(): Promise<React.JSX.Element> {
  const stats = await zodFetch({
    url: "/api/social-stats",
    responseSchema: socialStatsResponseSchema,
  });

  return (
    <div data-component="SocialStatsPanel">
      {stats.map((stat) => (
        <PlatformCard key={stat.platform} data={stat} />
      ))}
    </div>
  );
}
```

Why: fetching data makes the component smart, so the file name uses smart-component casing while the DOM marker keeps the React component name.

## Incorrect — Dumb Component Uses a Smart File Name

```tsx
// src/features/social/PlatformCard.tsx

export function PlatformCard({
  data,
  onFollowClick,
}: {
  data: PlatformStat;
  onFollowClick: () => void;
}): React.JSX.Element {
  return (
    <article data-component="platform-card">
      <h3>{data.platform}</h3>
      <FollowButton onFollowClick={onFollowClick} />
    </article>
  );
}
```

Why: the component fetches no data and only receives a child callback, so it is dumb, but the file name uses smart-component casing.

## Correct — Dumb Component Uses a Dumb File Name

```tsx
// src/features/social/platform-card.tsx

export function PlatformCard({
  data,
  onFollowClick,
}: {
  data: PlatformStat;
  onFollowClick: () => void;
}): React.JSX.Element {
  return (
    <article data-component="platform-card">
      <h3>{data.platform}</h3>
      <FollowButton onFollowClick={onFollowClick} />
    </article>
  );
}
```

Why: the component is dumb, so both its file name and optional DOM marker use kebab-case.

## Incorrect — Component Marks Internal Descendants

```tsx
// src/features/credentials/credential-form.tsx

export function CredentialForm(): React.JSX.Element {
  return (
    <form data-component="credential-form">
      <input data-component="credential-form-account-name" />
      <button data-component="credential-form-submit">Create Credential</button>
    </form>
  );
}
```

Why: one component is claiming several internal DOM nodes instead of identifying only its meaningful surface.

## Correct — Component Marks Only Its Surface

```tsx
// src/features/credentials/credential-form.tsx

export function CredentialForm(): React.JSX.Element {
  return (
    <form data-component="credential-form">
      <input />
      <button>Create Credential</button>
    </form>
  );
}
```

Why: the marker identifies the component surface without turning internal controls into component identities.

## Incorrect — Artificial Wrapper Added Only for `data-component`

```tsx
// src/features/credentials/CredentialFormDialog.tsx

export function CredentialFormDialog(): React.JSX.Element {
  const handleSuccess = (): void => save();

  return (
    <div data-component="CredentialFormDialog" className="contents">
      <Dialog>
        <DialogTrigger />
        <DialogContent>
          <CredentialForm onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Why: the extra `div` exists only to carry the marker and does not own the dialog surface.

## Correct — Marker Uses the Existing Meaningful Surface

```tsx
// src/features/credentials/CredentialFormDialog.tsx

export function CredentialFormDialog(): React.JSX.Element {
  const handleSuccess = (): void => save();

  return (
    <Dialog>
      <DialogTrigger />
      <DialogContent data-component="CredentialFormDialog">
        <CredentialForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
```

Why: `DialogContent` renders the meaningful dialog DOM surface, so the component marker is forwarded there instead of creating another wrapper.

## Incorrect — Component Named in camelCase

```tsx
// src/features/social/platform-card.tsx

export function platformCard({ data }: { data: PlatformStat }): React.JSX.Element {
  return <article>{data.platform}</article>;
}
```

Why: React only resolves a capitalized JSX tag as a custom component, so `<platformCard />` would render a native `platformCard` element instead.

## Correct — Component Named in PascalCase

```tsx
// src/features/social/platform-card.tsx

export function PlatformCard({ data }: { data: PlatformStat }): React.JSX.Element {
  return <article>{data.platform}</article>;
}
```

Why: `PlatformCard` is PascalCase, so `<PlatformCard />` resolves as the component.
