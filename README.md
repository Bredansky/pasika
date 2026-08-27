# pasika

Documentation, the lint rules derived from it, and the CLI that applies and diagnoses both.

`pasika` owns the framework's documentation and turns it into checks. Every requirement in `docs/` is recorded in an enforcement registry that says which ESLint rule or `pasika` check governs it — or, when none does, how a reviewer or agent applies it by hand. CI fails when a requirement has no recorded answer.

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
  "ref": "pasika/no-mixed-concerns",
  "note": "counts exported components; a second component that is not exported is not detected"
}
```

The `text` field is the bullet as written in the document (markdown links and code spans intact), so it is greppable in the doc it came from; the `hash` is computed from the same text with links collapsed to their text and code spans unwrapped, so editing a URL or adding backticks does not read as a change.

Every requirement carries a `note` explaining how it is met: what the ref'd rule or doctor check does and where it falls short, or — with no `ref` — how a reviewer or agent applies it by hand. When a rule governs the requirement's subject without fully deciding it (e.g. its placement), the `ref` still names that rule and the `note` says what stays judgment, so a partial check never reads as a complete one.

`pasika coverage` fails when a requirement has no recorded answer, when its text changed, when it disappeared, when its `ref` names a rule or doctor check that does not exist, or when a requirement a rule governs has no test titled with its text. Confirm a reworded requirement with `pasika coverage --accept`.

## Commands

The documentation guide itself is linted: the `pasika/*` markdown rules run over `docs/**/*.md` and report title, overview, structure, example-pairing, and RFC 2119 violations at the exact node.

```bash
npx pasika coverage            # check that every requirement has recorded enforcement
npx pasika coverage --accept   # record reworded and removed requirements
```

Both accept `--json` for agent use.

A requirement `coverage` reports as `new` is classified with the hash it prints:

```bash
npx pasika coverage --classify d311a1457a --ref pasika/import-boundaries --note "reports imports that cross a feature boundary"
npx pasika coverage --classify 041b665bd7 --note "no check can compare against the previous state"
```

The command refuses a hash no requirement has, a `ref` naming a rule or doctor check that does not exist, and an entry without a note — so a mismatch cannot reach the registry by hand. Re-running it on an already-recorded requirement replaces the earlier entry.

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
| `pasika/locale-key-shape` | camelCase locale keys; keys over 30 characters end in a WAI-ARIA element role |
| `pasika/shared-style-dedup` † | A className combo used by two or more components becomes a named utility |
| `pasika/no-eslint-disable` | No `eslint-disable` directives |
| `pasika/zod-schema-validation` | Runtime validation through Zod schemas, not hand-written type guards |
| `pasika/source-under-src` | Application source lives under `src/`, not in root-level folders |

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
