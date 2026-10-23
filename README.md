# pasika 🐝

> пасіка — _apiary_ in Ukrainian

The documentation an agent works from, the ESLint rules that documentation turns into, and the runtime helpers those rules assume.

`pasika` is where a repository's conventions are written down once. Every requirement lives in `docs/`, and every one is recorded against the check that enforces it, so what the rules require and what the code does cannot drift apart. A **Rule** states requirements about one subject, a **Reference** defines the shapes and terms they are written in, a **Policy** collects the repo-wide ones, and a **Guide** sequences them into a workflow with its own glossary.

---

## 📦 Install

`zirka` brings pasika with it, as the package holding the preset's rules:

```sh
npm i -D zirka eslint prettier typescript
```

Standalone, the presets need the language plugins as peers:

```sh
npm i -D pasika eslint @eslint/css @eslint/json @eslint/markdown
```

The runtime helpers resolve `clsx` / `tailwind-merge`, `zod`, and `next` as optional peers, so install only the ones whose imports you use.

## ⚡ Quick start

Track the guides through `vulyk`, then switch them on in the ESLint config:

```sh
npx vulyk add https://github.com/Bredansky/pasika/tree/<commit>/docs/next-codebase-guide \
  --group managed --targets src
npx vulyk agents
```

```ts
// eslint.config.ts
import { RuleSeverity, styleguide } from "zirka";

const { eslintConfig } = styleguide({
  node: RuleSeverity.Error,
  typescript: RuleSeverity.Error,
  next: RuleSeverity.Error,
  pasikaNextjsApp: RuleSeverity.Error,
});

export default eslintConfig;
```

Without `zirka`, import `pasikaNextjsApp` from `pasika/eslint` and export it directly. `pasikaApp` is the plain-TypeScript preset — the manifest, the zirka contract, and the docs, with no `src/**` source block.

## 🛡️ The ruleset

95 rules over five scopes:

| Scope             | Rules | Language plugin                      |
| ----------------- | ----- | ------------------------------------ |
| `src/**` TS / TSX | 51    | `@typescript-eslint/parser`, bundled |
| `docs/**/*.md`    | 25    | `@eslint/markdown`                   |
| Stylesheets       | 12    | `@eslint/css`                        |
| `package.json`    | 6     | `@eslint/json`                       |
| `.husky/*`        | 1     | —                                    |

The requirement behind every rule id is in the guides; `npx tsx scripts/coverage.ts --json` prints the mapping. CI fails when a requirement has no recorded answer, when its text changed, when its ref names no rule, or when a rule-governed requirement has no test titled with it.

Some rules are cross-file: where a component, hook, value, type, or style belongs depends on which files use it, so those index the whole `src/` tree instead of one file. A move therefore changes which file gets reported, which is why a lint command must not pass ESLint's `--cache` — the repository policy requires this — and why the index is read from disk rather than from ESLint's file list, so a partial run like `lint-staged` still judges against the true graph.

## 🧱 Runtime helpers

Six runtime helpers ship with the package, so a repository imports them instead of writing its own copy to the shape the rules expect:

| Import                 | Exports                                                      | Resolves against (optional peer) |
| ---------------------- | ------------------------------------------------------------ | -------------------------------- |
| `pasika/api-contract`  | `defineApiContract`, `apiErrorResponseSchema`, `ApiContract` | `zod`                            |
| `pasika/cn`            | `cn`                                                         | `clsx`, `tailwind-merge`         |
| `pasika/http-error`    | `HttpError`                                                  | —                                |
| `pasika/http-method`   | `HttpMethod`                                                 | —                                |
| `pasika/zod-fetch`     | `zodFetch`                                                   | `zod`                            |
| `pasika/with-response` | `withResponse`, `HandlerResult`, `ResponseHeaders`           | `next`, `zod`                    |

The entries share one `HttpError`, so a failure `zodFetch` throws satisfies the `instanceof` check `withResponse` makes. The TS/TSX rules call the TypeScript compiler API at lint time, so `typescript` is a pinned runtime dependency rather than a peer.

## 📚 Documentation

The guides ship in this repository and are adopted into a project through `vulyk`. Each one owns its glossary:

| Document                                                                                                                      | Covers                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Repository Policy](https://github.com/Bredansky/pasika/blob/main/docs/repository-policy.md)                                  | requirements spanning every change in a repository                          |
| [Next Codebase Guide](https://github.com/Bredansky/pasika/blob/main/docs/next-codebase-guide/next-codebase-guide.md)          | where code lives: modules, components, support files, imports               |
| [Next Tailwind Guide](https://github.com/Bredansky/pasika/blob/main/docs/next-tailwind-guide/next-tailwind-guide.md)          | theme tokens, class composition, variants, states                           |
| [Next Performance Guide](https://github.com/Bredansky/pasika/blob/main/docs/next-performance-guide/next-performance-guide.md) | reviewing external React performance guidance without automatic enforcement |
| [Documentation Guide](https://github.com/Bredansky/pasika/blob/main/docs/documentation-guide/documentation-guide.md)          | how documents themselves are written                                        |
| [Pasika Adoption Guide](https://github.com/Bredansky/pasika/blob/main/docs/pasika-adoption-guide/pasika-adoption-guide.md)    | adopting and updating the framework                                         |

### External React performance guidance

[Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) is installed as a **Vulyk-managed, commit-pinned skill** at `.agents/skills/vercel-react-best-practices/`. Its 70 upstream rules and generated reference material are checked into Git unchanged so updates produce a readable diff; the upstream snapshot is excluded from local Prettier formatting.

The upstream skill is **advisory**, not Pasika policy. When accepting advice, add a local Pasika Rule, classify any new requirements in the **existing** `scripts/registry.json` via `npx tsx scripts/coverage.ts --classify`, and implement/test ESLint enforcement only for reliable static checks. No separate rule mapping or automatic translation is introduced.

```sh
npx vulyk diff vercel-react-best-practices
npx vulyk update vercel-react-best-practices
npx vulyk sync
npx vulyk stage
npm run test:requirements
```

The weekly [Vercel React Practices Sync](.github/workflows/vercel-react-best-practices-sync.yml) workflow proposes upstream updates as **draft PRs** for human review, not automatic ESLint changes. The repository's GitHub Actions settings must allow pull-request creation.

## 🐝 Sibling packages

| Package                                     | What it does                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------- |
| [vulyk](https://github.com/Bredansky/vulyk) | Installs skills and tracked docs from pinned sources, and generates agent files |
| **pasika**                                  | The documentation, the rules derived from it, and the helpers — this package    |
| [zirka](https://github.com/Bredansky/zirka) | Wires ESLint, Prettier, and TypeScript into one `styleguide()` config           |

## 🧪 Development

```sh
npm run lint         # eslint, including the framework's own docs rules
npm run typecheck
npm run test:unit
npm run test:requirements # every requirement still has recorded enforcement
npm run build
npm run dogfood -- ../some/repo   # lint a sibling repo with the built presets
```

## 📄 License

MIT
