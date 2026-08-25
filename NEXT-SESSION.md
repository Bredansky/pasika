# Next session

Pick up the pasika framework work. Everything below is committed and published; nothing is half-finished.

## Read first

- `README.md` — the enforcement model: registry, `pasika coverage`, `pasika docs`
- `enforcement/registry.json` — every documented requirement and how it is checked
- `docs/framework-adoption-guide/framework-adoption-guide.md` — the adopt / update / plan workflows

**Fetch before working in any repo.** Last session published a bad vulyk release from a stale `master`, which dropped a fix that had already shipped. `git fetch` first, every repo, every time.

**vulyk's default branch is `master`.** pasika and zirka use `main`.

**`npx vulyk@latest` can serve a stale cached binary** — it reported `0.11.10` while `0.12.1` was current. Pin the version (`npx vulyk@0.12.1`) or install it locally when the version matters.

## Published state

| Package | Version | Notes |
| --- | --- | --- |
| `pasika` | 0.3.1 | docs + 9 ESLint rules + `pasika docs` / `pasika coverage` |
| `zirka` | 0.0.39 | depends on `pasika@^0.3.0`; `styleguide({ pasika: Error })` yields all 9 rules |
| `vulyk` | 0.12.1 | new: `render: "summary" | "embed"` on entry, group, or manifest |

Consumers are untouched: karaylo still runs `pasika@^0.1.4` / `zirka@^0.0.33` with `pasika: RuleSeverity.Off`.

## Milestone 1 — karaylo consumes the framework

Prerequisite for everything else: it is the first end-to-end proof, and it will surface defects that fixtures do not. Last session found two such defects within ten minutes of running the rules against real trees.

1. **Manifest.** `karaylo/vulyk.json` still names `agent-conventions`, and that file no longer exists — it is `docs/agent-policy.md` now, so `vulyk update` will 404. Rename the entry, repoint every entry at the current pasika commit, and set `"render": "embed"` on the policy entry so its body lands in `AGENTS.md` while the guides stay pointers. Then `vulyk sync && vulyk agents`.
2. **Dependencies.** `pasika@^0.3.1`, `zirka@^0.0.39`. Drop `--cache` from the `lint` and `fix` scripts — `agent-policy.md` requires it, because the two cross-file rules need every file in the run.
3. **Structure migration.** karaylo puts components in `src/features/<feature>/components/`, which `application-structure-rule` does not permit; components sit directly in the feature folder. This is the bulk of the work and blocks a clean lint run.
4. **Turn the ruleset on.** `pasika: RuleSeverity.Error` in `eslint.config.ts`, then work the findings down. There were ~54 before the structure migration. Use *How To Plan the Work an Adoption or Update Requires* in the adoption guide — group by rule, placement before naming before import paths, one milestone per change set.

Then repeat for **shineposter3000**, but its `vulyk.json` is still the pre-`groups` schema. Zod strips the unknown keys, so the manifest parses to **zero entries** and `cleanupStale` is entitled to delete every file listed in `.vulyk`. Migrate that manifest before running any vulyk command there.

## Milestone 2 — work down the 71 `planned` requirements

Each carries a `note` naming the check that should cover it. The loop per requirement:

```bash
npx pasika coverage --json          # find the requirement and its hash
# write the rule or check
# write a test whose title is the requirement's exact text
npx pasika coverage --classify <hash> --kind eslint --ref pasika/<rule>
```

`coverage` refuses a ref naming a rule that does not exist, and refuses to call a requirement lint-enforced with no test behind it.

| Count | Intended check | Notes |
| --- | --- | --- |
| 35 | `eslint` | Single-file rules: smart/dumb classification, `data-testid` casing, jsx-hygiene, support-folder shape, import-through-index, named exports |
| 29 | `doctor` | `pasika doctor` does not exist yet. Scope agreed: **dependencies and docs only** — required packages, exact-version policy, vulyk drift, the `--cache` ban, config baseline. Everything about code and paths belongs in ESLint |
| 6 | `docs-check` | RFC 2119 vocabulary only in bullets, subject headings in a Policy document, guide link anchors, no nested How To, glossary-term linking. **Write these as ESLint rules — see milestone 3** |
| 1 | `zirka` | Enable `@eslint-community/eslint-comments/no-use` so the "no `eslint-disable`" requirement is actually enforced. **It will fail pasika's own lint** until three rule files stop using disable blocks — `enforce-cva-variant-props`, `no-mixed-concerns`, `enforce-cn-merge`. `no-arbitrary-tailwind` shows the pattern for typing the AST without `any` |

13 CSS/stylesheet requirements sit inside the doctor count but need a stylesheet parser rather than the import graph. `@eslint/css` may suit them better than doctor — worth deciding before starting.

## Milestone 3 — move the documentation checks into ESLint

Decided, not yet done. Everything derived from files in the repository belongs to ESLint; `pasika doctor` keeps only the environment. That makes `pasika docs` redundant and it gets deleted. `pasika coverage` stays, because reconciling documentation against enforcement is not linting.

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

Do this when the 6 planned `docs-check` requirements come up — write those as ESLint rules and port the existing 19 in the same pass, so the set moves once.

What it costs:

- The 26 registry entries whose `ref` names a `docs-check` id all need re-mapping to rule ids, and `isRefKnown` loses its `docs-check` branch.
- zirka gains `@eslint/markdown` and a `markdown` block, installed by every consumer including repos with no docs.
- `docs/managed/**` must be ignored in consumer repos: those files are vulyk-managed and owned upstream.
- Three checks are cross-document — `policy-single-document` counts policy documents repo-wide, `guide-folder-entry-point` looks for an entry point in a sibling folder, and the glossary-term check compares a guide against a glossary elsewhere. They need the same memoized project index the code rules use, for the same reason `--cache` stays banned.

Sequenced third deliberately: it is a port of checks that already pass, so it adds ergonomics rather than coverage. karaylo and the code rules come first.

## Known gaps

- **19 `judgment` + 13 `permission`** requirements will never be mechanically checked. Nine of the permissions are exceptions a future check must honour, each naming that check in its `note`. Write `data-testid-case` without the single-outer-element exemption and it emits false positives while coverage stays green.
- **`--kind doctor` accepts any `ref` unvalidated**, because doctor checks have no id list yet. Add that validation with doctor.
- **A config-owned schema must move to the root support folder while a config-owned type may stay.** That asymmetry is what the docs literally say — the MAY-stay bullets cover types and constants, not schemas. If a schema deriving its shape from the configuration should also stay, it is a one-line doc change plus adding `schemas` to `CONFIG_OWNED_FOLDERS`.
- **`pasika doctor` is referenced by the adoption guide and by `agent-policy.md` but does not exist.** Those two documents describe a command you cannot run yet.

## Conventions to keep

- One requirement is stated in exactly one Rule or Policy document. References describe and define; they never constrain.
- A rule test's `describe` title is the requirement's exact text. That is how `coverage` proves a test exists.
- Never hand-edit `enforcement/registry.json`. `--classify` and `--accept` own it, and `writeRegistry` owns its ordering.
- Run `npm run lint && npm run typecheck && npm test && npm run docs && npm run coverage` before committing. CI runs the same five.
