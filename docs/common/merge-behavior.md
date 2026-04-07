# Merge Behavior

`pasika` merges into an existing `.claude/settings.json` by default.

It updates the Claude base pieces owned by `pasika`:

- `hooks.Notification`
- `hooks.PreToolUse`
- `statusLine`

It preserves unrelated project-specific settings such as:

- custom permissions
- extra hooks like `PostToolUse`
- plugin and marketplace config

Use `--force` only when you want to replace the file instead of merging.
