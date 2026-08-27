# pasika

Documentation, the lint rules derived from it, and the CLI that applies and diagnoses both.

`pasika` owns the framework's documentation and turns it into checks. Every requirement in `docs/` is recorded in an enforcement registry that says which ESLint rule, which `pasika` check, or which manual review covers it — and CI fails when a requirement has no answer.

## Layout

```text
docs/
  agent-policy.md                 # agent-conduct requirements (Policy)
  repository-policy.md            # repo-wide code and documentation requirements (Policy)
  code-organization-guide/        # placement, extraction, module conventions
  documentation-guide/            # how documents themselves are written
  framework-adoption-guide/       # adopting and updating the framework
  styling-guide/                  # Tailwind theme, composition, variants, states
enforcement/
  registry.json                   # requirement → enforcement, keyed by content hash
  coverage.ts                     # reconciles the docs against the registry
eslint/
  pasika/rules/                   # the lint rules, with fixture tests beside them
  pasika/rules/md/                # the documentation-guide rules, linting docs/ itself
cli/
  index.ts                        # the `pasika` command
```

## Documentation

Documents come in four kinds — Guide, Rule, Policy, and Reference — each with a template and a creation rule under `docs/documentation-guide/`. A Rule owns requirements about one subject and demonstrates them with paired Incorrect/Correct examples; a Reference describes and defines but never constrains; a Policy document collects repo-wide requirements that span unrelated subjects; a Guide sequences the others into workflows. Each guide owns its own glossary, so a term is defined beside the workflow that uses it.

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

The `text` field is the bullet as written in the document (markdown links and code spans intact), so it is greppable in the doc it came from; the `hash` is computed from the same text with links collapsed to their text and code spans unwrapped, so editing a URL or adding backticks does not read as a change. The `note` field is where a check's known gap is recorded, so a partial check never reads as a complete one.

| Kind | Meaning |
| --- | --- |
| `eslint` | An ESLint rule reports it, and a fixture test titled with the requirement pins it |
| `doctor` | A `pasika doctor` check reports it |
| `planned` | Mechanically checkable, not written yet; `note` names the intended check |
| `manual` | No mechanical check decides it; the reviewer or agent applies it, or the requirement merely grants permission — `note` says why |

`pasika coverage` fails when a requirement is unclassified, when its text changed, when it disappeared, when its `ref` names a check that does not exist, or when a lint-enforced requirement has no test. Confirm a reworded requirement with `pasika coverage --accept`.

## Commands

The documentation guide itself is linted: the `pasika/*` markdown rules run over `docs/**/*.md` and report title, overview, structure, example-pairing, and RFC 2119 violations at the exact node.

```bash
npx pasika coverage            # check that every requirement has recorded enforcement
npx pasika coverage --accept   # record reworded and removed requirements
```

Both accept `--json` for agent use.

A requirement `coverage` reports as `new` is classified with the hash it prints:

```bash
npx pasika coverage --classify d311a1457a --kind eslint --ref pasika/import-boundaries
npx pasika coverage --classify 041b665bd7 --kind manual --note "no check can compare against the previous state"
```

The command refuses a hash no requirement has, a `ref` naming a rule or check that does not exist, a `ref` on a kind that nothing reports, and `manual` or `planned` without a note — so a mismatch cannot reach the registry by hand. Re-running it on an already-classified requirement reclassifies it and reports what it was.

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

`zirka` composes the full pasika ruleset over four file scopes: TS/TSX under `src/**`, `globals.css` and other stylesheets, `package.json`, and markdown — each with its own ESLint language.

### Without Zirka

```ts
// eslint.config.ts
import { pasikaConfig } from "pasika/eslint";

export default [pasikaConfig];
```

`pasikaConfig` applies the TS/TSX rules to `src/**` only, so a repository without a `src/` tree passes it trivially. The CSS, JSON, and markdown language configs are composed by `zirka`'s `styleguide()`; the individual rule objects (`cssRules`, `jsonRules`, `mdRules`) are exported for manual wiring.

### TS/TSX rules

| Rule | Enforces |
| --- | --- |
| `pasika/filename-case` | kebab-case for files that define no component |
| `pasika/import-boundaries` | The shorter of the relative path and the `@/*` alias, and the layer boundaries |
| `pasika/no-mixed-concerns` | One exported React component per `.tsx` file |
| `pasika/no-arbitrary-tailwind` | No arbitrary `-[value]` classes, including inside `cn()` conditionals |
| `pasika/enforce-cn-merge` | `cn()` instead of `+` or template literals; at most five classes per group |
| `pasika/enforce-cva-variant-props` | `VariantProps<typeof …>` instead of hand-written unions |
| `pasika/cva-appearance-props` | Visual option props (`size`, `variant`, …) declared through CVA appearance props |
| `pasika/cva-boolean-variants` | Boolean appearance props placed on the CVA variant, not as standalone props |
| `pasika/enforce-barrel-exports` | A nested `index.ts` re-exports only its component |
| `pasika/component-placement` † | The folder a component's consumers imply |
| `pasika/support-file-placement` † | The folder a hook, type, schema, constant, or utility belongs in |
| `pasika/application-structure` | The path-based parts of the application structure and configuration rules |
| `pasika/named-exports` | Named exports for application files (framework routing files may default-export) |
| `pasika/data-testid-case` | `data-testid` casing where a rendered result carries one |
| `pasika/support-folder-shape` | A `constants/`, `types/`, or `schemas/` folder defines exports directly in `index.ts` or in named-re-exported files |
| `pasika/import-through-index` | An extracted constant, type, or schema is imported through its folder's `index.ts` |
| `pasika/util-file-name` | A single-function utility file is named in the function's kebab-case form |
| `pasika/no-util-barrel` | A utility is imported directly, without a barrel |
| `pasika/jsx-hygiene` | Calculations and complex conditions stay out of JSX children and attributes |
| `pasika/interactive-component` | Interactive elements are component boundaries when mixed with other content |
| `pasika/ui-state` | Native or ARIA state expression and Tailwind state variants |
| `pasika/cross-feature-import` | A component importing from two or more feature folders lives in a shared location |
| `pasika/pure-function-extract` | Pure functions extracted to `utils/`, even with one consumer |
| `pasika/hook-complexity` | Hook complexity limits (imperative categories per hook) |
| `pasika/locale-dotted-path` | A namespaced locale is read through its full dotted path |
| `pasika/locales-location` | Locales live in the named locales object |
| `pasika/hook-extraction` † | A hook with two or more consumers is extracted to its own file |
| `pasika/value-extraction` † | A value with cross-folder consumers is extracted |
| `pasika/config-extraction` † | A type, schema, or utility used outside its config module is moved |
| `pasika/component-nesting` † | A component is not nested solely because it has support files |
| `pasika/stay-flat` † | A component stays flat until it has exclusive children |
| `pasika/type-extraction` † | A type or schema with cross-folder consumers is extracted |
| `pasika/locale-placement` † | Shared locales at the top level, single-feature locales namespaced |
| `pasika/shared-style-dedup` † | A className combo used by two or more components becomes a named utility |
| `pasika/no-eslint-disable` | No `eslint-disable` directives |
| `pasika/zod-schema-validation` | Runtime validation through Zod schemas, not hand-written type guards |

### CSS rules

Applied to `src/**/globals.css` (and other stylesheets) through `@eslint/css` with tolerant Tailwind v4 parsing.

| Rule | Enforces |
| --- | --- |
| `pasika/theme-reset` | A `--*: initial` theme reset is present |
| `pasika/root-variables` | `:root` defines the CSS custom properties |
| `pasika/apply-usage` | `@layer base` uses `@apply` for declarations |
| `pasika/base-layer-pair` | The base layer applies `base-canvas` and `base-ink` |
| `pasika/stylesheet-ordering` | Imports → `@custom-variant` → `:root` → `@theme` → `@utility` → `@layer base` |
| `pasika/css-variable-naming` | Background vars named `--<role>-canvas`, text vars `--<role>-ink` |
| `pasika/custom-utility-apply` | `@utility` blocks use `@apply` |
| `pasika/surface-utility` | Repeated canvas+ink combos become a named surface utility |
| `pasika/theme-variable-namespace` | Utility class groups share a namespace prefix |
| `pasika/global-css-location` | Global CSS lives in the correct entry point |

### JSON rules

Applied to `package.json` through `@eslint/json`.

| Rule | Enforces |
| --- | --- |
| `pasika/no-cache-flag` | Lint scripts don't pass `--cache` |
| `pasika/no-vulyk-dependency` | `vulyk` is not in `dependencies` |

### Documentation rules

The `pasika/*` markdown rules enforce the documentation guide over `docs/**/*.md` (24 rules): file-name suffixes and titles, overview presence and length, guide step structure, Incorrect/Correct pairing, policy document shape, reference block headings, RFC 2119 placement, template hygiene, link anchoring, and glossary-term linking. They run through `@eslint/markdown`; `pasika coverage` verifies each has a test and a registry entry. Pasika's own `docs/` are linted by them in CI (`npm run lint`).

Run `pasika coverage --json` for the exact requirement each rule covers.

### † Cross-file rules

Where a component, hook, value, type, or style belongs depends on which files use it, so the rules marked † index the whole `src/` tree instead of looking at one file. Two consequences:

- **Do not pass `--cache`.** Move a file and the finding belongs to a *different* file, whose cache entry is unchanged — so ESLint would replay a stale verdict. `repository-policy.md` requires lint commands to run without it.
- The index is read from disk rather than from ESLint's file list, so a partial run such as `lint-staged` still judges against the true graph.

All are inert in a repository with no `src/` tree.

## Development

```bash
npm run lint
npm run typecheck
npm run test
npm run coverage
npm run build
```
