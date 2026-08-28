# Tech Stack Rule

A repository that adopts the framework installs its packages through package.json. This rule requires every package the Tech Stack Reference names to be declared there.

- A repository adopting the framework MUST list every package the Tech Stack Reference names as a dependency or devDependency in package.json.

## Incorrect — Stack Package Missing From the Manifest

```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3"
  }
}
```

Why: `clsx` and `tailwind-merge` are absent, so the `cn` helper cannot resolve conflicting utilities the styling Rules assume.

## Correct — Every Stack Package Declared

```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "19.2.3",
    "clsx": "2.1.1",
    "tailwind-merge": "3.4.0"
  }
}
```

Why: every package the Tech Stack Reference names resolves, so the framework's rules and configuration apply as written.
