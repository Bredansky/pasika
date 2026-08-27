# Pasika — Milestones

Progress tracked across sessions. Each milestone lists what's done and what's
left. Check items off as they land; move completed milestones to **Done**.

---

## M1 — Core Framework ✅

Registry, CLI, coverage, normalization, parsing.

- [x] `enforcement/registry.json` — requirement ↔ enforcement map keyed by content hash
- [x] `enforcement/parse-docs.ts` — recursive markdown parser extracting RFC-2119 bullets
- [x] `enforcement/normalize.ts` — canonical text normalization + hash
- [x] `enforcement/coverage.ts` — reconciles docs against registry; reports issues
- [x] `cli/index.ts` — `pasika coverage`, `--accept`, `--classify`, `--json`
- [x] `enforcement/types.ts` — shared types (Requirement, CoverageIssue, etc.)
- [x] Coverage test suite (`enforcement/coverage.test.ts`)

## M2 — ESLint Rules (TS/TSX) ✅

Source-level lint rules enforcing code-organization, styling, and import rules.

- [x] `pasika/no-mixed-concerns` — one exported component per .tsx file
- [x] `pasika/filename-case` — kebab-case for non-component files
- [x] `pasika/import-boundaries` — alias shortest + layer boundaries
- [x] `pasika/no-arbitrary-tailwind` — no `-[value]` arbitrary classes
- [x] `pasika/enforce-cn-merge` — `cn()` instead of `+`; max five per group
- [x] `pasika/enforce-cva-variant-props` — `VariantProps<typeof …>`
- [x] `pasika/enforce-barrel-exports` — nested `index.ts` re-exports only its component
- [x] `pasika/component-placement` — folder based on consumer imports (cross-file)
- [x] `pasika/support-file-placement` — hook/type/schema/const/utility folder (cross-file)
- [x] `pasika/component-conventions` — component structure rules
- [x] `pasika/interactive-component` — interactive element patterns
- [x] `pasika/jsx-hygiene` — JSX best practices
- [x] `pasika/pure-function-extract` — pure function extraction
- [x] `pasika/ui-state` — UI state management patterns
- [x] `pasika/hook-complexity` — hook complexity limits
- [x] `pasika/cva-appearance-props` — CVA appearance props
- [x] `pasika/cva-boolean-variants` — CVA boolean variant patterns
- [x] `pasika/enforce-cn-merge` — cn() merge enforcement
- [x] `pasika/locales-location` — locale file placement
- [x] `pasika/locale-dotted-path` — locale import paths
- [x] `pasika/named-exports` — named export conventions
- [x] `pasika/no-util-barrel` — no util barrel files
- [x] `pasika/util-file-name` — util file naming
- [x] `pasika/support-folder-shape` — support folder structure
- [x] `pasika/cross-feature-import` — cross-feature import boundaries
- [x] Project index (`eslint/pasika/project/index.ts`) — cross-file rule data
- [x] Rule tester (`eslint/pasika/rule-tester.ts`)
- [x] All tests passing

## M3 — Documentation Rules (Markdown) ✅

Markdown lint rules enforcing the documentation guide over `docs/**/*.md`.

- [x] `pasika/doc-kind-suffix` — file-name suffix matches doc kind
- [x] `pasika/title-matches-file-name` — H1 title matches file stem
- [x] `pasika/overview-present` — every doc has an overview paragraph
- [x] `pasika/overview-length` — overview is 2–5 sentences
- [x] `pasika/overview-no-links` — overview paragraph has no links
- [x] `pasika/guide-step-single-sentence` — guide steps are one sentence
- [x] `pasika/guide-step-single-link` — guide steps have one link max
- [x] `pasika/guide-folder-entry-point` — guide has an index.md
- [x] `pasika/guide-link-anchors` — guide link targets exist
- [x] `pasika/rule-paired-examples` — Rule docs have Incorrect/Correct pairs
- [x] `pasika/example-heading-description` — example headings have descriptions
- [x] `pasika/policy-no-examples` — Policy docs have no examples
- [x] `pasika/policy-single-document` — one policy doc per policy subject
- [x] `pasika/policy-subject-headings` — policy has per-subject H2s
- [x] `pasika/reference-block-headings` — Reference uses block-level headings
- [x] `pasika/reference-no-rfc-vocabulary` — no RFC 2119 in references
- [x] `pasika/rfc-only-in-bullets` — RFC 2119 only in list items
- [x] `pasika/requirement-present` — every doc has at least one requirement
- [x] `pasika/no-cross-document-link` — no links across docs
- [x] `pasika/no-nested-how-to` — no nested How-To sections
- [x] `pasika/no-template-prompt` — no template prompts in docs
- [x] `pasika/support-document-placement` — support doc placement
- [x] `pasika/glossary-term-linking` — glossary terms are linked
- [x] `pasika/guide-states-no-requirement` — guide states doc has no requirements
- [x] Markdown rule tester (`eslint/pasika/rules/md/rule-tester.ts`)
- [x] Markdown project index (`eslint/pasika/rules/md/project-index.ts`)
- [x] All tests passing

## M4 — Doctor → ESLint Migration 🔄

**Scope update (2026-08-27):** This milestone spans both repositories. Pasika
owns and exports the rules; zirka owns the consumer-facing `styleguide()`
configuration and must provide compatible ESLint/plugin dependencies. ESLint
10 adoption is in progress in both packages. No milestone item is complete
until pasika and zirka typecheck and their relevant runtime checks pass.

**Current blockers:** zirka's old ESLint/plugin dependency graph is being
upgraded for ESLint 10; pasika's own lint currently exercises zirka's config
through the local package tree. The CSS/JSON rules use the official native
`CSSRuleDefinition`, `JSONRuleDefinition`, and `MarkdownRuleDefinition` types;
no cross-package type assertions are intended.


Move file-content checks from `pasika doctor` to ESLint rules so they run in
CI rather than on-demand. Doctor keeps only **environment checks** (config
existence, managed-file mtime, source root, framework packages).

### CSS Rules (globals.css checks via `@eslint/css`)

- [x] `@eslint/css` installed; tolerant mode enables real Tailwind v4 parsing (pasika + zirka dependency adoption pending final verification)
- [x] `eslint/pasika/rules/css/helpers.ts` — walkNodes, blockWalker, blockChildren
- [x] `eslint/pasika/rules/css/rule-tester.ts` — CSS RuleTester setup
- [x] `pasika/theme-reset` — `--*: initial` theme reset present
- [x] `pasika/root-variables` — `:root` defines CSS custom properties
- [x] `pasika/apply-usage` — `@layer base` uses `@apply` for declarations
- [x] `pasika/base-layer-pair` — base layer applies base-canvas and base-ink
- [x] `pasika/stylesheet-ordering` — imports → @custom-variant → :root → @theme → @utility → @layer base
- [x] `pasika/css-variable-naming` — background vars named `--<role>-canvas`, text `--<role>-ink`
- [x] `pasika/custom-utility-apply` — `@utility` blocks use `@apply`
- [x] `pasika/surface-utility` — repeated canvas+ink combos → named surface utility
- [x] `pasika/theme-variable-namespace` — utility class groups use shared namespace prefix
- [x] `pasika/global-css-location` — global CSS lives in the correct entry point
- [x] All CSS rule tests passing (39 tests)

### JSON Rules (package.json checks via `@eslint/json`)

- [x] `@eslint/json` installed (pasika + zirka dependency adoption pending final verification)
- [x] `eslint/pasika/rules/json/rule-tester.ts` — JSON RuleTester setup
- [x] `pasika/no-vulyk-dependency` — vulyk not in dependencies
- [x] `pasika/no-cache-flag` — lint scripts don't use `--cache`
- [x] All JSON rule tests passing

### TS/TSX Source Rules (using project index)

These doctor checks use `getProjectIndex()` and can become ESLint rules.

- [ ] `pasika/hook-extraction` — hooks with 2+ consumers → extract to own file
- [ ] `pasika/value-extraction` — values with cross-folder consumers → extract
- [ ] `pasika/config-extraction` — config types/schemas used outside config → move
- [ ] `pasika/component-nesting` — component nested only for support files → flatten
- [ ] `pasika/stay-flat` — component stays flat until exclusive children
- [ ] `pasika/locale-placement` — shared locales in top-level object
- [ ] `pasika/type-extraction` — types/schemas with cross-folder consumers → extract
- [ ] `pasika/shared-style-dedup` — repeated className combos → shared utility
- [ ] `pasika/no-eslint-disable` — no eslint-disable directives (already covered by `@eslint-community/eslint-comments/no-use`)

### Registration & Wiring

- [x] All rules registered in `eslint/pasika/index.ts`
- [x] CSS/JSON rule index files (`rules/css/index.ts`, `rules/json/index.ts`)
- [x] `zirka/styleguide.ts` owns Markdown, CSS, and JSON language configs for consumers
- [x] CSS/JSON configs scoped to correct file patterns (don't leak JS rules into CSS)
- [x] Zirka `styleguide.ts` builds Markdown/CSS/JSON configs from pasika rules for consumers
- [x] `@eslint/css`, `@eslint/json`, and `@eslint/markdown` installed in zirka and verified with its package graph
- [x] Align ESLint major versions and compatible plugin versions in pasika and zirka
- [x] Remove all temporary type assertions and eslint suppressions introduced during migration
- [x] Keep `jiti` as a direct dev dependency in repositories that lint `.ts` ESLint configs

### Registry Re-classification

- [ ] Re-classify 10 CSS doctor entries → `eslint` refs
- [ ] Re-classify 2 JSON doctor entries → `eslint` refs
- [ ] Re-classify ~9 TS/TSX doctor entries → `eslint` refs (after rules written)
- [ ] Verify `pasika coverage` passes with zero issues

### Trim Doctor

- [ ] Remove migrated check functions from `doctor.ts`
- [ ] Keep only: `checkConfigBaseline`, `checkManagedFiles`, `checkSourceRoot`, `checkFrameworkPackages`, `findGlobalStylesheet` (existence check)
- [ ] Update `doctor.test.ts` for trimmed doctor
- [ ] Update `cli/index.ts` if needed

### Verification

- [x] Pasika `npm run lint` — clean on the final zirka dependency
- [x] Pasika `npm run typecheck` — clean
- [x] Pasika tests — all pass (366)
- [x] Pasika `npm run build` — clean
- [x] Zirka typecheck — clean
- [x] Zirka consumer configuration includes Markdown, CSS, and JSON language blocks
- [x] `npx tsx cli/index.ts coverage` — zero issues
- [ ] Commit and push both repositories

## M5 — Documentation Cleanup

- [x] Reword `agent-policy.md` finding requirement to name both lint and doctor sources
- [ ] Update `README.md` with new CSS/JSON rules in the ruleset table

## M6 — Future

Items identified but not yet scoped:

- [ ] `eslint-comments/no-use` in zirka config (enforce no-`eslint-disable` via plugin)
- [ ] Doc lint rules run on consumer repos' docs (currently only pasika's own docs)
- [ ] Consider `@eslint/css` for consumer-level CSS validation beyond globals.css
- [ ] Doctor output JSON mode for agent consumption
- [ ] Doctor `--fix` for auto-applying safe remediations

---

## Session Log

| Date       | What happened                                                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-27 | Started M4: CSS + JSON rules written and tested; typecheck clean. Registry shows 98 eslint, 30 doctor, 21 judgment, 13 permission (162 total). `NEXT-SESSION.md` deleted during session. |
| 2026-08-27 | Reworded agent-policy.md finding requirement to name both lint and doctor as sources. |
| 2026-08-27 | Created MILESTONES.md to track progress across sessions. |
| 2026-08-27 | Wired CSS/JSON configs into zirka `styleguide.ts`; consumers now get CSS/JSON rules through the pasika styleguide option. Fixed pasika lint error in helpers.ts (`no-unnecessary-condition`). |
| 2026-08-27 | Expanded M4 to explicitly cover both pasika and zirka. Researched native language rule-definition types; ESLint 10/plugin compatibility and final verification remain open. |
| 2026-08-27 | Standardized zirka plugin-object names as `pasikaJsTs`, `pasikaCss`, and `pasikaJson`; all are ESLint plugins, with language names distinguishing their rule sets. |
| 2026-08-27 | Corrected dependency ownership: `@babel/core` belongs to zirka because zirka directly uses `@babel/eslint-parser`; it is not a pasika dependency. |
| 2026-08-27 | Decided to internalize pasika's Markdown config: pasika owns its docs linting; zirka owns only consumer JS/TS/CSS/JSON composition. |
| 2026-08-27 | Confirmed `jiti` remains a direct dev dependency for TypeScript ESLint config loading; removed reliance on transitive hoisting. |
| 2026-08-27 | Separated repository and consumer configuration: zirka owns consumer Markdown/CSS/JSON language configs; pasika retains rule implementations and build-time language dependencies. Both repositories pass their checks. |
