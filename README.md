# pasika

Documentation, the lint rules derived from it, and the checks that apply and diagnose both.

`pasika` owns the framework's documentation and turns it into checks. Every requirement in `docs/` is recorded in an enforcement registry that says which ESLint rule or `pasika` check governs it — or, when none does, how a reviewer or agent applies it by hand. CI fails when a requirement has no recorded answer.

## Layout

```text
docs/
  repository-policy.md            # repo-wide code and documentation requirements (Policy)
  code-organization-guide/        # placement, extraction, module conventions
  documentation-guide/            # how documents themselves are written
  framework-adoption-guide/       # adopting and updating the framework
  styling-guide/                  # Tailwind theme, composition, variants, states
scripts/
  registry.json                   # requirement → enforcement, keyed by content hash
  coverage.ts                     # reconciles the docs against the registry
  dogfood.ts                      # lints sibling repos with the built presets
  utils/                          # doc parsing, classification, registry IO
  types/                          # registry schema
constants/
  rfc2119.ts                      # single source of truth for RFC 2119 vocabulary
eslint/
  rules/                          # the lint rules, with fixture tests beside them
  rules/documentation/            # the documentation-guide rules, linting docs/ itself
  rules/tailwind/                 # the Tailwind stylesheet rules
  rules/package-json/             # the package.json rules
  rules/husky/                    # the husky-hook rules
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
  "note": "counts exported components; a second component that is not exported is not detected",
}
```

The `text` field is the bullet as written in the document (markdown links and code spans intact), so it is greppable in the doc it came from; the `hash` is computed from the same text with links collapsed to their text and code spans unwrapped, so editing a URL or adding backticks does not read as a change.

Every requirement carries a `note` explaining how it is met: what the ref'd rule does and where it falls short, or — with no `ref` — how a reviewer or agent applies it by hand. When a rule governs the requirement's subject without fully deciding it (e.g. its placement), the `ref` still names that rule and the `note` says what stays judgment, so a partial check never reads as a complete one.

`npm run coverage` fails when a requirement has no recorded answer, when its text changed, when it disappeared, when its `ref` names a rule that does not exist, or when a requirement a rule governs has no test titled with its text. Confirm a reworded requirement with `npx tsx scripts/coverage.ts --accept`.

## Commands

The documentation guide itself is linted: the `pasika/*` markdown rules run over `docs/**/*.md` and report title, overview, structure, example-pairing, and RFC 2119 violations at the exact node.

The coverage checks are standalone scripts under `scripts/`, run with `tsx`; the drift check is the published `libyear` tool — there is no `pasika` binary:

```bash
npm run coverage             # check that every requirement has recorded enforcement
npm run coverage -- --accept # record reworded and removed requirements
npx libyear --limit-major-individual=1   # fail when a dependency trails the latest by >1 major (drift check)
```

Both acceptance and the report accept `--json` for agent use:

```bash
npx tsx scripts/coverage.ts            # text report
npx tsx scripts/coverage.ts --json     # full report as JSON
npx tsx scripts/coverage.ts --accept   # record accepted changes
```

A requirement the report shows as `new` is classified with the hash it prints:

```bash
npx tsx scripts/coverage.ts --classify d311a1457a --ref pasika/import-boundaries --note "reports imports that cross a feature boundary"
npx tsx scripts/coverage.ts --classify 041b665bd7 --note "no check can compare against the previous state"
```

The script refuses a hash no requirement has, a `ref` naming a rule that does not exist, and a classification without a note — so a mismatch cannot reach the registry by hand. Re-running it on an already-recorded requirement replaces the earlier entry. All of it reads and writes `scripts/registry.json`.

## Dogfooding

`npm run dogfood` lints an arbitrary repository with pasika's built presets, without modifying the target. It exists to find flaws in pasika itself by running it against sibling repos — it does not fix the target. Run `npm run build` first, then point it at a repo:

```bash
npm run build
npm run dogfood -- ../some/repo                 # nextjsApp preset (default)
npm run dogfood -- ../some/repo --preset=typescriptApp
npm run dogfood -- ../some/repo --pasika-only   # tally only pasika/* rules
npm run dogfood -- ../some/repo --rule=css-entry-point --findings
npm run dogfood -- ../some/repo --json          # machine-readable report
```

The script writes a temporary standalone `eslint.config.mjs` that imports the preset from this repo's `dist`, so it exercises exactly the config a consuming repository would write. The exit code reports whether the run succeeded; the target's problem count is informational (printed as `Exit code would be`). A missing `dist` build or an unknown flag exits non-zero.

## ESLint ruleset

### With Zirka (recommended)

```ts
// eslint.config.ts — Next.js application
import { RuleSeverity, styleguide } from "zirka";

const { eslintConfig } = styleguide({
  next: RuleSeverity.Error,
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  pasikaNextjsApp: RuleSeverity.Error,
});

export default eslintConfig;
```

For a plain TypeScript repository, enable `pasikaTypescriptApp` instead of `pasikaNextjsApp`; that preset covers the manifest, the zirka contract, and the docs only — the `src/**` source rules belong to the Next.js app preset. `zirka` composes the pasika ruleset over four file scopes: TS/TSX under `src/**`, `globals.css` and other stylesheets, `package.json`, and markdown — each with its own ESLint language.

### Without Zirka

```ts
// eslint.config.ts — plain TypeScript repository
import { typescriptApp } from "pasika/eslint";

export default typescriptApp;
```

`typescriptApp` is the plain-TypeScript-repository preset — the package.json manifest, the zirka configuration contract, and the docs. It carries no `src/**` source block: source linting is the Next.js app's job. `nextjsApp` is the full framework preset: everything in `typescriptApp` plus the Next.js-stack manifest requirement, the `src/**` app source rules, and the Tailwind stylesheet blocks. The granular rule objects (`tailwindRules`, `repoPackageJsonRules`, `documentationRules`) stay exported for manual wiring.

The `src/**` blocks ship `@typescript-eslint/parser` themselves, so a standalone preset parses `.ts`/`.tsx` correctly on its own (`pasika` lists it as a runtime dependency).

Because the preset blocks also wire ESLint's language plugins, using them directly (without `zirka`) requires `@eslint/css`, `@eslint/json`, and `@eslint/markdown` to be installed in the consuming project — they are `peerDependencies` of `pasika`. A `zirka`-based setup gets them automatically.

### TS/TSX rules

| Rule                               | Enforces                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pasika/filename-case`             | kebab-case for files that define no component                                                                       |
| `pasika/import-boundaries`         | The shorter of the relative path and the `@/*` alias, and the layer boundaries                                      |
| `pasika/no-mixed-concerns`         | One exported React component per `.tsx` file                                                                        |
| `pasika/no-arbitrary-tailwind`     | No arbitrary `-[value]` classes, including inside `cn()` conditionals                                               |
| `pasika/unknown-utility`           | Component class names are a custom `@utility`, a theme-generated utility, or a built-in the reset keeps             |
| `pasika/enforce-cn-merge`          | `cn()` instead of `+` or template literals; at most five classes per group                                          |
| `pasika/enforce-cva-variant-props` | `VariantProps<typeof …>` instead of hand-written unions                                                             |
| `pasika/cva-appearance-props`      | Visual option props (`size`, `variant`, …) declared through CVA appearance props                                    |
| `pasika/cva-boolean-variants`      | Boolean appearance props placed on the CVA variant, not as standalone props                                         |
| `pasika/enforce-barrel-exports`    | A nested `index.ts` re-exports only its component                                                                   |
| `pasika/component-placement` †     | The folder a component's consumers imply                                                                            |
| `pasika/support-file-placement` †  | The folder a hook, type, schema, constant, or utility belongs in                                                    |
| `pasika/application-structure`     | The path-based parts of the application structure and configuration rules                                           |
| `pasika/named-exports`             | Named exports for application files (framework routing files may default-export)                                    |
| `pasika/data-testid-case`          | `data-testid` casing where a rendered result carries one                                                            |
| `pasika/support-folder-shape`      | A `constants/`, `types/`, or `schemas/` folder defines exports directly in `index.ts` or in named-re-exported files |
| `pasika/import-through-index`      | An extracted constant, type, or schema is imported through its folder's `index.ts`                                  |
| `pasika/util-file-name`            | A single-function utility file is named in the function's kebab-case form                                           |
| `pasika/no-util-barrel`            | A utility is imported directly, without a barrel                                                                    |
| `pasika/jsx-hygiene`               | Calculations and complex conditions stay out of JSX children and attributes                                         |
| `pasika/interactive-component`     | Interactive elements are component boundaries when mixed with other content                                         |
| `pasika/ui-state`                  | Native or ARIA state expression and Tailwind state variants                                                         |
| `pasika/cross-feature-import`      | A component importing from two or more feature folders lives in a shared location                                   |
| `pasika/pure-function-extract`     | Pure functions extracted to `utils/`, even with one consumer                                                        |
| `pasika/hook-complexity`           | Hook complexity limits (imperative categories per hook)                                                             |
| `pasika/locale-dotted-path`        | A namespaced locale is read through its full dotted path                                                            |
| `pasika/locales-location`          | Locales live in the named locales object                                                                            |
| `pasika/hook-extraction` †         | A hook with two or more consumers is extracted to its own file                                                      |
| `pasika/value-extraction` †        | A value with cross-folder consumers is extracted                                                                    |
| `pasika/config-extraction` †       | A type, schema, or utility used outside its config module is moved                                                  |
| `pasika/component-nesting` †       | A component is not nested solely because it has support files                                                       |
| `pasika/stay-flat` †               | A component stays flat until it has exclusive children                                                              |
| `pasika/type-extraction` †         | A type or schema with cross-folder consumers is extracted                                                           |
| `pasika/locale-placement` †        | Shared locales at the top level, single-feature locales namespaced                                                  |
| `pasika/locale-key-shape`          | camelCase locale keys; keys over 30 characters end in a WAI-ARIA element role                                       |
| `pasika/shared-style-dedup` †      | A className combo used by two or more components becomes a named utility                                            |
| `pasika/repeated-structure`        | A block of elements repeated two or more times is extracted as a named component                                    |
| `pasika/sole-state-owner`          | A contiguous JSX part that is the sole consumer of a useState hook is extracted into a named component              |
| `pasika/zirka-baseline`            | eslint, prettier, and TypeScript configuration come from zirka instead of being restated locally                    |
| `pasika/zod-schema-validation`     | Runtime validation through Zod schemas, not hand-written type guards                                                |
| `pasika/source-under-src`          | Application source lives under `src/`, not in root-level folders                                                    |

### Tailwind rules

Applied to `src/**/globals.css` (and other stylesheets) through `@eslint/css` with tolerant Tailwind v4 parsing.

| Rule                              | Enforces                                                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pasika/theme-reset`              | A `--*: initial` theme reset is present                                                               |
| `pasika/root-variables`           | `:root` defines the CSS custom properties                                                             |
| `pasika/apply-usage`              | `@layer base` uses `@apply` for declarations                                                          |
| `pasika/base-layer-pair`          | The base layer applies `base-canvas` and `base-ink`                                                   |
| `pasika/stylesheet-ordering`      | Imports → `@custom-variant` → `:root` → `@theme` → `@utility` → `@layer base`                         |
| `pasika/css-variable-naming`      | Background vars named `--<role>-canvas`, text vars `--<role>-ink`                                     |
| `pasika/custom-utility-apply`     | `@utility` blocks use `@apply`                                                                        |
| `pasika/surface-utility`          | Repeated canvas+ink combos become a named surface utility                                             |
| `pasika/theme-variable-namespace` | Utility class groups share a namespace prefix                                                         |
| `pasika/css-entry-point` †        | One global entry, imported by one module, project CSS only in a stylesheet the entry imports directly |
| `pasika/unused-utility`           | A custom `@utility` no source file references is reported as dead                                     |

### Package.json rules

Applied to `package.json` through `@eslint/json`. The framework-agnostic subset (`no-vulyk-dependency`, `exact-version`) applies to any repository, including pasika itself; `nextjs-stack` applies to a Next.js/React application, and `vulyk-docs` to a repository adopting the framework.

| Rule                         | Enforces                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `pasika/no-vulyk-dependency` | `vulyk` is not in `dependencies`                                                    |
| `pasika/exact-version`       | Dependency and devDependency versions are pinned exactly, never ranges              |
| `pasika/nextjs-stack`        | All Tech Stack Reference packages are listed in `package.json` (Next.js/React apps) |
| `pasika/vulyk-docs`          | `vulyk.config.ts` tracks the framework's docs from pasika and `AGENTS.md` exists    |

### Documentation rules

The `pasika/*` markdown rules enforce the documentation guide over `docs/**/*.md` (22 rules): file-name suffixes and titles, overview shape (presence, sentence count, links), guide step structure, Incorrect/Correct pairing, policy document shape, reference block headings, RFC 2119 placement, template hygiene, link anchoring, and glossary-term linking. They run through `@eslint/markdown`; `npm run coverage` verifies each has a test and a registry entry. Pasika's own `docs/` are linted by them in CI (`npm run lint`).

Run `npx tsx scripts/coverage.ts --json` for the exact requirement each rule covers.

### † Cross-file rules

Where a component, hook, value, type, or style belongs depends on which files use it — and whether a stylesheet sits inside the global import graph depends on the whole `src/` tree — so the rules marked † index the whole `src/` tree instead of looking at one file. Two consequences:

- **Do not pass `--cache`.** Move a file and the finding belongs to a _different_ file, whose cache entry is unchanged — so ESLint would replay a stale verdict. `repository-policy.md` requires lint commands to run without it.
- The index is read from disk rather than from ESLint's file list, so a partial run such as `lint-staged` still judges against the true graph.

All are inert in a repository with no `src/` tree.

## Runtime dependency on typescript

Many of the TS/TSX rules call the TypeScript compiler API directly at lint time, so the published package imports `typescript` at runtime. `tsup` keeps it external (unbundled); `pasika` lists it as a pinned `dependency` so an installing consumer gets a version known to work with the rules. There is no `typescript` `peerDependency`.

## Development

```bash
npm run lint
npm run typecheck
npm run test
npm run coverage
npm run build
npm run dogfood -- ../some/repo   # requires a build; see Dogfooding above
```
