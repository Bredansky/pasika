# Smart vs Dumb Component Rule

Without a file-name convention, a component's smart vs dumb ownership is invisible to reviewers from the tree alone. Without a `data-testid` matching the file's casing, tests hardcode DOM identities that break on rename or restructure.

- A smart component file name MUST be `PascalCase.tsx`.
- A dumb component file name MUST be `kebab-case.tsx`.
- A smart component with one outer DOM element in every rendered result MUST set `data-testid` on that element, and its value MUST match the component name in `PascalCase`.
- A smart component MUST render exactly one outer DOM element in every rendered result, and MUST set `data-testid` on it; a smart component with no single outer element MUST wrap its content in one instead of rendering multiple roots.
- A dumb component MAY set `data-testid` on its root element, and the value MUST be `kebab-case`.
- [Next.js App Router routing files](https://nextjs.org/docs/app/getting-started/project-structure#routing-files) MUST use their required kebab-case names and are exempt from smart/dumb file-name and `data-testid` requirements.

## Incorrect — Smart Component Uses a Dumb Name

```tsx
// src/features/social/social-stats-panel.tsx
"use client";

import { useSocialStats } from "./hooks/use-social-stats";
import { PlatformCard } from "./platform-card";
import { locales } from "@/locales";

export function SocialStatsPanel(): React.JSX.Element {
  const { stats, isLoading } = useSocialStats();

  return (
    <div data-testid="social-stats-panel">
      {isLoading ? (
        <p>{locales.social.loading}</p>
      ) : (
        stats.map((stat) => <PlatformCard key={stat.platform} data={stat} />)
      )}
    </div>
  );
}
```

Why: fetching data makes the component smart, but its file name and `data-testid` use dumb-component casing.

## Correct — Smart Component Uses a Smart Name

```tsx
// src/features/social/SocialStatsPanel.tsx
"use client";

import { useSocialStats } from "./hooks/use-social-stats";
import { PlatformCard } from "./platform-card";
import { locales } from "@/locales";

export function SocialStatsPanel(): React.JSX.Element {
  const { stats, isLoading } = useSocialStats();

  return (
    <div data-testid="SocialStatsPanel">
      {isLoading ? (
        <p>{locales.social.loading}</p>
      ) : (
        stats.map((stat) => <PlatformCard key={stat.platform} data={stat} />)
      )}
    </div>
  );
}
```

Why: fetching data makes the component smart, so its file name and `data-testid` use `PascalCase`.

## Incorrect — Dumb Component Uses a Smart Name

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
    <article data-testid="PlatformCard">
      <h3>{data.platform}</h3>
      <FollowButton onFollowClick={onFollowClick} />
    </article>
  );
}
```

Why: the component fetches no data and only receives a child callback, so it is dumb. Its file name and `data-testid` use smart-component casing.

## Correct — Dumb Component Uses a Dumb Name

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
    <article data-testid="platform-card">
      <h3>{data.platform}</h3>
      <FollowButton onFollowClick={onFollowClick} />
    </article>
  );
}
```

Why: the component is dumb, so its file name and `data-testid` use `kebab-case`.

## Incorrect — Smart Component Renders Multiple Roots

```tsx
// src/features/social/SocialStatsPanel.tsx
"use client";

export function SocialStatsPanel(): React.JSX.Element {
  const { stats, isLoading } = useSocialStats();

  return isLoading ? <p>{locales.social.loading}</p> : <PlatformList stats={stats} />;
}
```

Why: this smart component has no single outer element, so no `data-testid` can anchor tests to the component. It must wrap its content in one outer element.

## Correct — Smart Component Wraps Multiple Roots

```tsx
// src/features/social/SocialStatsPanel.tsx
"use client";

export function SocialStatsPanel(): React.JSX.Element {
  const { stats, isLoading } = useSocialStats();

  return (
    <section data-testid="SocialStatsPanel">
      {isLoading ? <p>{locales.social.loading}</p> : <PlatformList stats={stats} />}
    </section>
  );
}
```

Why: the wrapper gives tests one stable outer element to anchor `data-testid="SocialStatsPanel"` to, no matter which branch renders.
