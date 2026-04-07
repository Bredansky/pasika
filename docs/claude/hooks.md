# Claude Hooks

`pasika` ships the reusable shared Claude hooks.

## `status-line/index.js`

Displays a two-line status view with:

- model name
- current folder
- git branch when available
- used context percentage as a 10-segment bar
- session cost
- session duration

## `notification.sh`

Sends a desktop notification when Claude needs attention.

- macOS: `terminal-notifier` with click-to-focus VS Code behavior, falls back to `osascript`
- Linux: `notify-send`
- Windows: PowerShell message box

## `protect-files.sh`

Blocks edits to:

- `.env` files
- `package-lock.json`
- files inside `.git/`
