# pasika

Documentation, the lint rules derived from it, and the CLI that applies and diagnoses both.

`pasika` owns the framework's documentation and turns it into checks. Every requirement in `docs/` is recorded in an enforcement registry that says which ESLint rule, which `pasika` check, or which human judgment covers it — and CI fails when a requirement has no answer.

## Layout

```text
docs/
  agent-conventions.md            # repo-wide requirements (Conventions)
  code-organization-guide/        # placement, extraction, module conventions
  documentation-guide/            # how documents themselves are written
  framework-adoption-guide/       # adopting and updating the framework
  styling-guide/                  # Tailwind theme, composition, variants, states
enforcement/
  registry.json                   # requirement → enforcement, keyed by content hash
  coverage.ts                     # reconciles the docs against the registry
  docs-check.ts                   # the documentation guide, mechanically
eslint/
  pasika/rules/                   # the lint rules, with fixture tests beside them
cli/
  index.ts                        # the `pasika` command
```

## Documentation

Documents come in four kinds — Guide, Rule, Conventions, and Reference — each with a template and a creation rule under `docs/documentation-guide/`. A Rule owns requirements about one subject and demonstrates them with paired Incorrect/Correct examples; a Reference describes and defines but never constrains; Conventions collect repo-wide requirements that span unrelated subjects; a Guide sequences the others into workflows.

## Enforcement

Requirements are identified by a hash of their canonical text, not by a hand-written id, so rewording one is visible:

```jsonc
{
  "doc": "code-organization-guide/rules/no-mixed-concerns-rule.md",
  "text": "A .tsx file that defines a component MUST contain exactly one component.",
  "hash": "b19fe3bd34",
  "kind": "eslint",
  "ref": "pasika/no-mixed-concerns",
  "note": "counts exported components; a second component that is not exported is not detected"
}
```

The `note` field is where a check's known gap is recorded, so a partial check never reads as a complete one.

| Kind | Meaning |
| --- | --- |
| `eslint` | An ESLint rule reports it, and a fixture test titled with the requirement pins it |
| `doctor` | A `pasika doctor` check reports it |
| `docs-check` | A `pasika docs` check reports it |
| `planned` | Mechanically checkable, not written yet; `note` names the intended check |
| `judgment` | No mechanical check can decide it; `note` says why |
| `permission` | The requirement grants permission, so there is nothing to check |

`pasika coverage` fails when a requirement is unclassified, when its text changed, when it disappeared, when its `ref` names a check that does not exist, or when a lint-enforced requirement has no test. Confirm a reworded requirement with `pasika coverage --accept`.

## Commands

```bash
npx pasika docs                # check a docs/ folder against the documentation guide
npx pasika docs --dir content  # check another folder
npx pasika coverage            # check that every requirement has recorded enforcement
npx pasika coverage --accept   # record reworded and removed requirements
```

Both accept `--json` for agent use.

## ESLint ruleset

### With Zirka (recommended)

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

### Without Zirka

```ts
// eslint.config.ts
import { pasikaConfig } from "pasika/eslint";

export default [pasikaConfig];
```

The ruleset applies to `src/**` only, so a repository without a `src/` tree passes it trivially.

| Rule | Enforces |
| --- | --- |
| `pasika/filename-case` | kebab-case for files that define no component |
| `pasika/import-boundaries` | The shorter of the relative path and the `@/*` alias, and the layer boundaries |
| `pasika/no-mixed-concerns` | One exported React component per `.tsx` file |
| `pasika/no-arbitrary-tailwind` | No arbitrary `-[value]` classes, including inside `cn()` conditionals |
| `pasika/enforce-cn-merge` | `cn()` instead of `+` or template literals; at most five classes per group |
| `pasika/enforce-cva-variant-props` | `VariantProps<typeof …>` instead of hand-written unions |
| `pasika/enforce-barrel-exports` | A nested `index.ts` re-exports only its component |
| `pasika/component-placement` † | The folder a component's consumers imply |
| `pasika/support-file-placement` † | The folder a hook, type, schema, constant, or utility belongs in |

Run `pasika coverage --json` for the exact requirement each rule covers.

### † Cross-file rules

Where a component or support file belongs depends on which files import it, so these two rules index the whole `src/` tree instead of looking at one file. Two consequences:

- **Do not pass `--cache`.** Move a file and the finding belongs to a *different* file, whose cache entry is unchanged — so ESLint would replay a stale verdict. `agent-conventions.md` requires lint commands to run without it.
- The index is read from disk rather than from ESLint's file list, so a partial run such as `lint-staged` still judges against the true graph.

Both are inert in a repository with no `src/` tree.

## Development

```bash
npm run lint
npm run typecheck
npm run test
npm run docs
npm run coverage
npm run build
```
