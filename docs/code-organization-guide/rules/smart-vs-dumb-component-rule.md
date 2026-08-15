# Smart vs Dumb Component Rule

Without a file-name convention, a component's smart vs dumb ownership is invisible to reviewers from the tree alone. Without a `data-testid` matching the file's casing, tests hardcode DOM identities that break on rename or restructure.

- A smart component MUST fetch data, or define `handle*` callbacks and pass them to children as `on*` props.
- A dumb component MUST NOT fetch data.
- A dumb component MUST NOT define `handle*` callbacks for children.
- A dumb component MAY own local UI state.
- A smart component file name MUST be `PascalCase.tsx`.
- A dumb component file name MUST be `kebab-case.tsx`.
- A smart component MUST set `data-testid` on its root element, and its value MUST match the component name in `PascalCase`.
- A dumb component MAY set `data-testid` on its root element, and the value MUST be `kebab-case`.
- Next.js routing files MUST use the framework's required lowercase or kebab-case file names and are exempt from smart/dumb file-name and `data-testid` requirements.

## Incorrect — Smart Component Uses a Dumb Name

```tsx
// src/features/social/social-stats-panel.tsx
"use client";

import { useSocialStats } from "./hooks/use-social-stats";
import { PlatformCard } from "./platform-card";

export function SocialStatsPanel(): React.JSX.Element {
  const { stats, isLoading } = useSocialStats();

  if (isLoading) {
    return <p>Loading...</p>;
  }

  return (
    <div data-testid="social-stats-panel">
      {stats.map((stat) => (
        <PlatformCard key={stat.platform} data={stat} />
      ))}
    </div>
  );
}
```

Why: the file fetches data, which makes it smart, yet it is named `kebab-case.tsx` and its `data-testid` is `social-stats-panel` (kebab) rather than the component name in `PascalCase`. Both the file name and the testid contradict what the file actually does.

## Correct — Smart Component Uses a Smart Name

```tsx
// src/features/social/SocialStatsPanel.tsx
"use client";

import { useSocialStats } from "./hooks/use-social-stats";
import { PlatformCard } from "./platform-card";

export function SocialStatsPanel(): React.JSX.Element {
  const { stats, isLoading } = useSocialStats();

  return (
    <div data-testid="SocialStatsPanel">
      {isLoading ? <p>Loading...</p> : stats.map((stat) => <PlatformCard key={stat.platform} data={stat} />)}
    </div>
  );
}
```

Why: the file fetches data, so it is named `PascalCase.tsx`. Anyone scanning the file tree immediately knows this component owns data-fetching logic, and the `data-testid` on the root element matches the component name in `PascalCase`.

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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article data-testid="PlatformCard">
      <h3>{data.platform}</h3>
      <FollowButton onFollowClick={onFollowClick} />
      <ExpandToggle isExpanded={isExpanded} onToggleClick={() => setIsExpanded(!isExpanded)} />
    </article>
  );
}
```

Why: the component fetches no data and defines no `handle*` callbacks for its children — it receives the only child callback as an `on*` prop from its parent and holds nothing but local UI state. That makes it dumb, so `PascalCase.tsx` and a `PascalCase` `data-testid` both misname it.

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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article data-testid="platform-card">
      <h3>{data.platform}</h3>
      <FollowButton onFollowClick={onFollowClick} />
      <ExpandToggle isExpanded={isExpanded} onToggleClick={() => setIsExpanded(!isExpanded)} />
    </article>
  );
}
```

Why: the component is unchanged — only its name is. Because it fetches no data and defines no `handle*` callbacks, it is dumb, so the file is `kebab-case.tsx` and the `data-testid` is `kebab-case` to match. Local UI state (`isExpanded`) is no obstacle: a dumb component can own state that only it consumes.
