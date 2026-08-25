# pasika

Reusable agent setup package.

`pasika` stores portable agent setup assets that individual repos can apply or adapt.

## Scope

This repo intentionally starts narrow:

- reusable agent setup assets only
- shared docs at the repo root
- no project-specific workflows or business logic

## Layout

```text
docs/
  code-organization-guide/
  documentation-guide/
  styling-guide/
  agent-conventions.md
eslint/
  pasika/
    rules/
dist/
  ...
```

## What belongs here

- portable setup scripts
- shared naming and layout conventions
- reusable source-organization lint rules

## What stays in project repos

- final agent config folders in project repos
- project-specific rules, agents, and prompts
- repository-specific plugin choices
- scripts that depend on a specific app, CI setup, or codebase

## Development

```bash
npm run lint
npm run typecheck
npm run build
```

## ESLint Pasika Ruleset

Pasika ships enforceable lint rules derived from its documentation. Each rule carries a `@see` annotation linking to its source doc so future audits can verify rule/doc alignment.

### Usage with Zirka (recommended)

Enable pasika through Zirka's `styleguide`:

```ts
// eslint.config.ts
import { RuleSeverity, styleguide } from "zirka";

const { eslintConfig } = styleguide({
  next: RuleSeverity.Error,
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  pasika: RuleSeverity.Error,
});

export default eslintConfig;
```

### Usage without Zirka

Import the config directly and compose with your own:

```ts
// eslint.config.ts
import { pasikaConfig } from "pasika/eslint";
import { RuleSeverity, styleguide } from "zirka";

const { eslintConfig } = styleguide({
  next: RuleSeverity.Error,
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
});

export default [...((await eslintConfig) ?? []), pasikaConfig];
```

### Rule → Doc Mapping

Every rule's source file declares the documentation it enforces. Use this table to trace a lint hit back to its reasoning:

| Rule | Enforces | Source Doc |
|---|---|---|
| `pasika/filename-case` | Smart/PascalCase vs dumb/kebab-case file names | `docs/code-organization-guide/rules/smart-vs-dumb-component-rule.md` |
| `pasika/import-boundaries` | Relative vs `@/*` imports, layer boundaries | `docs/code-organization-guide/rules/exports-and-imports-rule.md` |
| `pasika/no-mixed-concerns` | One React component per `.tsx` file | `docs/code-organization-guide/rules/no-mixed-concerns-rule.md` |
| `pasika/no-arbitrary-tailwind` | No arbitrary `-[value]` Tailwind classes | `docs/styling-guide/rules/arbitrary-value-rule.md` |
| `pasika/enforce-cn-merge` | Use `cn()` not `+`/template literals; ≤5 classes per group | `docs/styling-guide/rules/class-composition-rule.md` |
| `pasika/enforce-cva-variant-props` | Use `VariantProps<typeof>` not manual union types | `docs/styling-guide/rules/component-variant-rule.md` |
| `pasika/enforce-barrel-exports` | Nested `index.ts` only re-exports the parent component | `docs/code-organization-guide/rules/folder-nesting-rule.md` |
