# Zirka Baseline Rule

A repository that adopts the framework takes its lint, format, and TypeScript configuration from the shared `zirka` baseline rather than restating it locally. This rule requires the framework's configuration contract to hold.

- A repository MUST take its lint, format, and TypeScript configuration from `zirka` and its rules from `pasika` rather than restating them locally.

## Incorrect — Configuration Restated Locally

```ts
// eslint.config.ts
export default [{ files: ["**/*.ts"], rules: { "no-unused-vars": "error" } }];
```

Why: the lint rules are restated in the repository, so its configuration drifts from the framework's baseline and every repository maintains its own copy.

## Correct — Configuration Imported From zirka

```ts
// eslint.config.ts
import { RuleSeverity, styleguide } from "zirka";

const { eslintConfig } = styleguide({
  typescript: RuleSeverity.Error,
  pasikaTypescriptApp: RuleSeverity.Error,
});

export default eslintConfig;
```

Why: the eslint configuration and the pasika ruleset come from `zirka`, and so do the `tsconfig.json` that extends `zirka/typescript` and the prettier config that reads `styleguide({ prettier: true }).prettierConfig` — the framework's baseline applies without being restated.
