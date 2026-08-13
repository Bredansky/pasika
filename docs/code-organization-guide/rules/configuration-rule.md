# Configuration Rule

Configuration objects centralize values that control application behavior. This rule keeps each object and the files that only support it together in `src/config/`.

- A configuration object that centralizes values used to control application behavior MUST live in `src/config/`.
- A configuration object with supporting types, schemas, or utilities MUST use one dedicated folder under `src/config/`.
- A consumer of a value defined by a configuration object MUST read that value from the configuration object.

## Incorrect — Platform Setting Duplicated Outside Its Config

```tsx
// src/features/stream/components/youtube-button.tsx
const youtubeUrl = "https://www.youtube.com/@karaylo/live";

export function YouTubeButton(): React.JSX.Element {
  return <a href={youtubeUrl}>YouTube</a>;
}
```

Why: the component creates its own copy instead of using the centralized platform setting.

## Correct — Platform Setting Read from Its Config

```ts
// src/config/platform-config.ts
export const PLATFORM_CONFIG = {
  youtube: {
    label: "YouTube",
    url: "https://www.youtube.com/@karaylo/live",
  },
  twitch: {
    label: "Twitch",
    url: "https://www.twitch.tv/karaylo",
  },
};
```

```tsx
// src/features/stream/components/youtube-button.tsx
import { PLATFORM_CONFIG } from "@/config/platform-config";

export function YouTubeButton(): React.JSX.Element {
  return <a href={PLATFORM_CONFIG.youtube.url}>YouTube</a>;
}
```

Why: the component reads the centrally maintained platform setting.
