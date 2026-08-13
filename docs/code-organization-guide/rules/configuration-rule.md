# Configuration Rule

Configuration objects centralize values that control application behavior. This rule keeps each object and the files that only support it together in `src/config/`.

- A configuration object that centralizes values used to control application behavior MUST live in `src/config/`.
- A configuration object MAY have a folder under `src/config/` for types, schemas, and utilities that support only that object.

## Incorrect — Platform Settings Stored as Constants

```ts
// src/constants/platforms.ts
export const youtubeUrl = "https://www.youtube.com/@karaylo/live";
export const twitchUrl = "https://www.twitch.tv/karaylo";
```

Why: platform labels and URLs are centralized application settings, not unrelated constants.

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

Why: the configuration object keeps application settings together in `src/config/`.
