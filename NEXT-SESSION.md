# Next session

Pick up the pasika framework work. Vulyk is released through `0.13.3`; Karaylo's migration is complete and validated but intentionally remains uncommitted for review. The next unfinished consumer migration is shineposter3000.

## Read first

- `README.md` — the enforcement model: registry, `pasika coverage`
- `enforcement/registry.json` — every documented requirement and how it is checked
- `docs/framework-adoption-guide/framework-adoption-guide.md` — the adopt / update / plan workflows

**Fetch before working in any repo.** Last session published a bad vulyk release from a stale `master`, which dropped a fix that had already shipped. `git fetch` first, every repo, every time.

**vulyk's default branch is `master`.** pasika and zirka use `main`.

**`npx vulyk@latest` can serve a stale cached binary** — pin the version (`npx vulyk@0.13.3`) or install it locally when the version matters.

## Published state

| Package | Version | Notes |
| --- | --- | --- |
| `pasika` | 0.3.1 | docs + 9 ESLint rules + 24 Markdown rules + `pasika coverage` (docs checks moved into ESLint) |
| `zirka` | 0.0.39 | depends on `pasika@^0.3.0`; `styleguide({ pasika: Error })` yields all 9 rules |
| `vulyk` | 0.13.3 | typed `vulyk.config.ts`, split local state/cache, linked Markdown resolution, GitHub ref lockfile, `render: "summary" | "embed"` |

Karaylo now uses `pasika@^0.3.1`, `zirka@^0.0.39`, `vulyk@^0.13.3`, typed `vulyk.config.ts`, `vulyk.lock.json`, and `.vulyk/` local state. Its sync, agents, lint, and typecheck checks pass; its changes remain uncommitted for review.

## Milestone 1 — karaylo consumes the framework (complete)

Karaylo is now the first end-to-end consumer proof. Completed work:

1. Migrated `vulyk.json` to typed `vulyk.config.ts` and added `vulyk.lock.json`.
2. Updated to `pasika@^0.3.1`, `zirka@^0.0.39`, and `vulyk@^0.13.3`; the pre-commit hook pins Vulyk `0.13.3`.
3. Migrated the source tree to the application-structure rule and fixed the resulting import-boundary findings.
4. Enabled `pasika: RuleSeverity.Error`; Karaylo lint and typecheck pass.
5. Ran `vulyk sync` and `vulyk agents`; generated docs and agent files are current.

After all Pasika framework requirements below are complete, migrate **shineposter3000**. Its `vulyk.json` still uses the pre-`groups` schema. Zod strips the unknown keys, so the manifest parses to **zero entries** and cleanup can delete every file listed in `.vulyk`. Do not run any Vulyk command there before migrating that manifest.

## Milestone 2 — work down the 49 remaining `planned` requirements (complete)

Current progress: `128/162` requirements are mechanically enforced (`98 eslint`, `30 doctor`), `0` remain planned, `21` are judgment, and `13` are permission. pasika doctor now checks: vulyk not in package.json, --cache flag in lint scripts, pasika/zirka installed, config baseline (eslint.config.ts references zirka, tsconfig.json exists), managed-file edit detection, source under src/, global stylesheet existence, theme reset, :root variables, @apply usage, base-canvas/base-ink pair, @theme inline, @custom-variant presence, custom utility @apply validation, surface-utility deduplication, theme-variable namespace enforcement, shared-style deduplication across components, eslint-disable usage in source files, and import-graph analysis (hook extraction, value extraction, config extraction, component nesting, locale placement, type extraction). The latest local rules include application structure, named exports, smart/dumb filenames, `data-testid`, support-folder shape, import-through-index, direct utility imports, utility naming, JSX hygiene, interactive-component extraction, className boundaries, UI-state/native-attribute enforcement, CVA appearance props, CVA boolean variants, cross-feature import boundaries, pure-function extraction, hook complexity, locale dotted-path, and locales-location; full lint, typecheck, tests, docs, and coverage pass.

No planned requirements remain — every requirement in `docs/` is classified, and `pasika coverage` reports zero issues. Keep shineposter3000 deferred until the remaining framework work is complete.

The one item left on the framework side is enabling `@eslint-community/eslint-comments/no-use` in zirka so the "no `eslint-disable`" requirement is enforced in consumer repos too (pasika's own lint already passes without disable blocks).

## Milestone 3 — move the documentation checks into ESLint (complete)

Done: the documentation checks are now ESLint rules under `eslint/pasika/rules/md/`, and `pasika docs` is deleted. Everything derived from files in the repository belongs to ESLint; `pasika doctor` keeps only the environment. That makes `pasika docs` redundant and it gets deleted. `pasika coverage` stays, because reconciling documentation against enforcement is not linting.

The mechanism is proven. `@eslint/markdown` 8.0.3 is the official ESLint language plugin for Markdown, and a custom rule runs over its AST. One of pasika's own checks ported as a probe:

```js
// eslint.config.mjs
import markdown from "@eslint/markdown";

export default [{
  files: ["docs/**/*-reference.md"],
  plugins: { markdown, probe: { rules: { "no-rfc-vocabulary": referenceNoRfc } } },
  language: "markdown/gfm",
  rules: { "probe/no-rfc-vocabulary": "error" },
}];
```

```text
docs/example-reference.md
  5:3  error  reference uses RFC 2119 vocabulary: MUST NOT  probe/no-rfc-vocabulary
```

Note the column: rules over the AST get real ranges, where the current checker computes line numbers by hand.

Done: the 6 planned checks were written as new rules and the 26 docs-check registry entries re-mapped to rule ids; `isRefKnown` lost its `docs-check` branch. `enforcement/docs-check.ts` and the `pasika docs` command (and its `npm run docs` script) are deleted; `pasika coverage` stays. The rules run through `@eslint/markdown` in `eslint.config.ts`'s `docs/**` block, so pasika's own `docs/` is linted by them.

What it cost:

- `@eslint/markdown` + `@types/mdast` as dev dependencies.
- The registry migration rewrote the 26 `docs-check` entries (and 6 planned docs entries) to `eslint` refs via a one-off script (since deleted).
- Three rules are cross-document — `policy-single-document` counts policy documents repo-wide, `guide-folder-entry-point` looks for an entry point in a sibling folder, and `glossary-term-linking` compares a guide against a glossary elsewhere. They share a memoized project index (`project-index.ts`) like the code rules.
- Decided: the markdown rules are **not** distributed to consumers. Docs are enforced where they are authored (pasika lints its own `docs/`); consumer repos receive conforming copies via vulyk, pinned to a pasika commit that passed lint and coverage. Consumer-side enforcement is the **managed-file diff check** (a planned requirement) — it catches stale copies, which is the only failure a consumer can actually act on (its `docs/managed/**` is owned upstream, so linting it there would flag files the consumer cannot fix). zirka gains no `@eslint/markdown` block; repos that author their own framework-convention docs can enable the rules directly, but no consumer does today.

## Known gaps

- **21 `judgment` + 13 `permission`** requirements will never be mechanically checked. Permissions are exceptions a future check must honour, each naming that check in its `note`. The smart-component `data-testid` rule preserves the single-outer-element exemption; interactive-component extraction is enforced.
- **`--kind doctor` accepts any `ref` unvalidated**, because doctor checks have no id list yet. Add that validation with doctor.
- **A config-owned schema must move to the root support folder while a config-owned type may stay.** That asymmetry is what the docs literally say — the MAY-stay bullets cover types and constants, not schemas. If a schema deriving its shape from the configuration should also stay, it is a one-line doc change plus adding `schemas` to `CONFIG_OWNED_FOLDERS`.

## Conventions to keep

- One requirement is stated in exactly one Rule or Policy document. References describe and define; they never constrain.
- A rule test's `describe` title is the requirement's exact text. That is how `coverage` proves a test exists.
- Never hand-edit `enforcement/registry.json`. `--classify` and `--accept` own it, and `writeRegistry` owns its ordering.
- Run `npm run lint && npm run typecheck && npm test && npm run build && npm run coverage` before committing. CI runs the same five.
