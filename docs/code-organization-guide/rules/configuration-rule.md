# Configuration Rule

Configuration is application data and settings, not behavior that belongs to a component or feature. This rule keeps it together in one app-wide location.

- Configuration values — hardcoded application data, environment parsing, and third-party service settings — MUST live in `src/config/` regardless of consumers.
- Configuration values MUST NOT be duplicated in `constants/`.

## Incorrect — Platform Settings Stored as Constants

```ts
// src/constants/platforms.ts
export const youtubeUrl = "https://www.youtube.com/@karaylo/live";
export const twitchUrl = "https://www.twitch.tv/karaylo";
```

Why: platform labels and URLs are application settings, not general constants.

## Correct — Platform Settings in `src/config/`

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

Why: application settings have one predictable location and stay together.
