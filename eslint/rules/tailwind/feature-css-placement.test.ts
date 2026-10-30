import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { featureCssPlacementRule } from "./feature-css-placement";
import { describe, tailwindRuleTester } from "./rule-tester";

function project(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-feature-css-")));
  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(root, "src", name);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }
  return root;
}

function check(files: Record<string, string>, target: string, errors: RegExp[] = []): void {
  const root = project(files);
  process.chdir(root);
  const filename = path.join(root, "src", target);
  const code = files[target] ?? "";
  tailwindRuleTester.run("feature-css-placement", featureCssPlacementRule, {
    valid: errors.length === 0 ? [{ filename, code }] : [],
    invalid: errors.length > 0 ? [{ filename, code, errors: errors.map((message) => ({ message })) }] : [],
  });
}

void describe("CSS used by a single feature MUST live in its feature stylesheet when one exists. CSS shared across features MUST live in `globals.css`.", () => {
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@utility mc-badge { display: block; }',
      "features/home/badge.tsx": 'const badge = "mc-badge";',
    },
    "app/styles/globals.css",
  );
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@import "./home.css";',
      "app/styles/home.css": "@utility mc-badge { display: block; }",
      "features/home/badge.tsx": 'const badge = "mc-badge";',
    },
    "app/styles/home.css",
  );
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@utility retro-glow { display: block; }',
      "app/styles/home.css": "@utility home-glow { display: block; }",
      "features/home/badge.tsx": 'const badge = "retro-glow home-glow";',
      "features/donation/widget.tsx": 'const widget = "retro-glow";',
    },
    "app/styles/globals.css",
  );
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";',
      "app/styles/home.css": "@utility unknown-class { display: block; }",
      "features/home/badge.tsx": 'const badge = "other";',
    },
    "app/styles/home.css",
  );
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@utility mc-badge { display: block; }',
      "app/styles/home.css": "@utility another { display: block; }",
      "features/home/badge.tsx": 'const badge = "mc-badge another";',
    },
    "app/styles/globals.css",
    [/CSS utility "mc-badge" is consumed only by feature "home"; define it in home\.css/],
  );
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";',
      "app/styles/home.css": "@utility retro-glow { display: block; }",
      "features/home/badge.tsx": 'const badge = "retro-glow";',
      "features/donation/widget.tsx": 'const widget = "retro-glow";',
    },
    "app/styles/home.css",
    [/CSS utility "retro-glow" is consumed across feature scopes; define it in globals\.css/],
  );
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";',
      "app/styles/home.css": "@utility donate-glow { display: block; }",
      "features/home/badge.tsx": 'const badge = "other";',
      "features/donation/widget.tsx": 'const widget = "donate-glow";',
    },
    "app/styles/home.css",
    [/CSS utility "donate-glow" is consumed only by feature "donation"; define it in donation\.css/],
  );
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";',
      "app/styles/shared.css": "@utility glow { display: block; }",
      "features/home/badge.tsx": 'const badge = "glow";',
    },
    "app/styles/shared.css",
  );
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";',
      "app/styles/effects.css": "@utility glow { display: block; }",
      "features/home/badge.tsx": 'const badge = "glow";',
    },
    "app/styles/effects.css",
  );
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";',
      "app/styles/features/home.css": "@utility glow { display: block; }",
      "features/home/badge.tsx": 'const badge = "glow";',
    },
    "app/styles/features/home.css",
  );

  // Shared CSS belongs in globals regardless of the stylesheet's name.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@import "./shared.css";',
      "app/styles/shared.css": "@utility retro-glow { display: block; }",
      "features/home/badge.tsx": 'const cls = "retro-glow";',
      "features/donation/widget.tsx": 'const cls = "retro-glow";',
    },
    "app/styles/shared.css",
    [/CSS utility "retro-glow" is consumed across feature scopes; define it in globals\.css/],
  );
  // A named feature stylesheet owns its local CSS even when the definition is in a generic file.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@import "./shared.css";\n@import "./home.css";',
      "app/styles/shared.css": "@utility home-badge { display: block; }",
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/badge.tsx": 'const cls = "home-badge";',
    },
    "app/styles/shared.css",
    [/CSS utility "home-badge" is consumed only by feature "home"; define it in home\.css/],
  );
  // A feature stylesheet is not mandatory until one has been created.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@import "./shared.css";',
      "app/styles/shared.css": "@utility home-badge { display: block; }",
      "features/home/badge.tsx": 'const cls = "home-badge";',
    },
    "app/styles/shared.css",
  );

  // Generated Tailwind classes provide direct ownership evidence for @theme.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@theme { --color-portal: #a855f7; }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "bg-portal";',
    },
    "app/styles/globals.css",
    [/CSS theme token "--color-portal" is consumed only by feature "home"; define it in home\.css/],
  );
  // A theme token depends on its runtime :root variable, not the other way around.
  check(
    {
      "app/styles/globals.css":
        '@import "tailwindcss";\n:root { --color-portal: #a855f7; }\n@theme inline { --color-portal: var(--color-portal); }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "bg-portal";',
    },
    "app/styles/globals.css",
    [
      /CSS root variable "--color-portal" is consumed only by feature "home"; define it in home\.css/,
      /CSS theme token "--color-portal" is consumed only by feature "home"; define it in home\.css/,
    ],
  );
  // An animation is owned by the consumer of the utility referencing it.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@keyframes portal-pulse { 50% { opacity: .4; } }',
      "app/styles/home.css": "@utility animate-portal { @apply [animation:portal-pulse_2s_linear]; }",
      "features/home/banner.tsx": 'const cls = "animate-portal";',
    },
    "app/styles/globals.css",
    [/CSS keyframes "portal-pulse" is consumed only by feature "home"; define it in home\.css/],
  );
  // @theme fonts propagate ownership to the full matching @font-face family.
  check(
    {
      "app/styles/globals.css":
        '@import "tailwindcss";\n@font-face { font-family: "Minecraft"; src: url("/minecraft.woff2"); }\n@theme { --font-minecraft: "Minecraft", monospace; }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "font-minecraft";',
    },
    "app/styles/globals.css",
    [
      /CSS font face "minecraft" is consumed only by feature "home"; define it in home\.css/,
      /CSS theme token "--font-minecraft" is consumed only by feature "home"; define it in home\.css/,
    ],
  );
  // Simple selectors and their pseudo states are also owned by consuming features.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n.portal-frame:hover { opacity: 0.5; }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "portal-frame";',
    },
    "app/styles/globals.css",
    [/CSS selector "portal-frame" is consumed only by feature "home"; define it in home\.css/],
  );
  // Sharing is about consumers, irrespective of the CSS construct being used.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@import "./home.css";',
      "app/styles/home.css": "@theme { --color-portal: #a855f7; }",
      "features/home/banner.tsx": 'const cls = "bg-portal";',
      "features/donation/widget.tsx": 'const cls = "text-portal";',
    },
    "app/styles/home.css",
    [/CSS theme token "--color-portal" is consumed across feature scopes; define it in globals\.css/],
  );
  // Foundations remain global even when current consumers happen to be local.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@theme { --color-base-canvas: #fff; }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "bg-base-canvas";',
    },
    "app/styles/globals.css",
  );
  // Global base-layer usage takes precedence over an individual feature.
  check(
    {
      "app/styles/globals.css":
        '@import "tailwindcss";\n@theme { --color-portal: #a855f7; }\n@layer base { body { @apply bg-portal; } }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "bg-portal";',
    },
    "app/styles/globals.css",
  );
  // Unused definitions and conditional overrides do not establish ownership.
  check(
    {
      "app/styles/globals.css":
        '@import "tailwindcss";\n@keyframes unknown { to {opacity:1} }\n@media (min-width: 30rem) { :root { --feature-gap: 1rem; } }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "home-frame";',
    },
    "app/styles/globals.css",
  );
  // A nested dependency chain carries feature ownership through multiple kinds.
  check(
    {
      "app/styles/globals.css":
        '@import "tailwindcss";\n:root { --portal-glow: #faf; }\n@keyframes portal-pulse { 50% { color: var(--portal-glow); } }',
      "app/styles/home.css": "@utility animate-portal { @apply [animation:portal-pulse_2s_linear]; }",
      "features/home/banner.tsx": 'const cls = "animate-portal";',
    },
    "app/styles/globals.css",
    [
      /CSS root variable "--portal-glow" is consumed only by feature "home"; define it in home\.css/,
      /CSS keyframes "portal-pulse" is consumed only by feature "home"; define it in home\.css/,
    ],
  );
  // Tailwind @theme --animate-* declarations propagate to their keyframes.
  check(
    {
      "app/styles/globals.css":
        '@import "tailwindcss";\n@keyframes portal-pulse { to { opacity: 1; } }\n@theme { --animate-portal: portal-pulse 2s linear infinite; }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "animate-portal";',
    },
    "app/styles/globals.css",
    [
      /CSS keyframes "portal-pulse" is consumed only by feature "home"; define it in home\.css/,
      /CSS theme token "--animate-portal" is consumed only by feature "home"; define it in home\.css/,
    ],
  );
  // A global base-layer selector is a system style, not a feature-owned class.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@layer base { .portal-frame { display: block; } }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "portal-frame";',
    },
    "app/styles/globals.css",
  );
  // Real font families may include multiple @font-face weight definitions.
  check(
    {
      "app/styles/globals.css":
        '@import "tailwindcss";\n@font-face { font-family: "Minecraft"; font-weight: 400; src: url(a.woff2); }\n@font-face { font-family: "Minecraft"; font-weight: 700; src: url(b.woff2); }\n@theme { --font-minecraft: "Minecraft", monospace; }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/banner.tsx": 'const cls = "font-minecraft";',
    },
    "app/styles/globals.css",
    [
      /CSS font face "minecraft" is consumed only by feature "home"; define it in home\.css/,
      /CSS font face "minecraft" is consumed only by feature "home"; define it in home\.css/,
      /CSS theme token "--font-minecraft" is consumed only by feature "home"; define it in home\.css/,
    ],
  );
  // Responsive :root overrides must not suppress ownership of the default.
  check(
    {
      "app/styles/globals.css":
        '@import "tailwindcss";\n:root { --feature-gap: 1rem; }\n@media (min-width: 30rem) { :root { --feature-gap: 2rem; } }',
      "app/styles/home.css": "@utility gap-card { @apply [padding:var(--feature-gap)]; }",
      "features/home/banner.tsx": 'const cls = "gap-card";',
    },
    "app/styles/globals.css",
    [/CSS root variable "--feature-gap" is consumed only by feature "home"; define it in home\.css/],
  );
  // A module can consume runtime variables without a generated Tailwind class.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n:root { --portal-gap: 1rem; }',
      "app/styles/home.css": "@utility frame { display: block; }",
      "features/home/card.tsx": 'const css = { padding: "var(--portal-gap)" };',
    },
    "app/styles/globals.css",
    [/CSS root variable "--portal-gap" is consumed only by feature "home"; define it in home\.css/],
  );
  // @apply propagates ownership through a utility into a theme token.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@theme { --color-portal: #a855f7; }',
      "app/styles/home.css": "@utility portal-frame { @apply text-portal; }",
      "features/home/card.tsx": 'const cls = "portal-frame";',
    },
    "app/styles/globals.css",
    [/CSS theme token "--color-portal" is consumed only by feature "home"; define it in home\.css/],
  );
  // A utility can depend on another custom utility across stylesheet boundaries.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@utility retro-outline { border: 1px solid; }',
      "app/styles/home.css": "@utility portal-frame { @apply retro-outline; }",
      "features/home/card.tsx": 'const cls = "portal-frame";',
    },
    "app/styles/globals.css",
    [/CSS utility "retro-outline" is consumed only by feature "home"; define it in home\.css/],
  );
  // Direct module animation properties can establish ownership without @utility.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@keyframes portal-pulse { to {opacity:1} }',
      "app/styles/home.css": "@utility frame { display: block; }",
      "features/home/card.tsx": 'const style = { animationName: "portal-pulse" };',
    },
    "app/styles/globals.css",
    [/CSS keyframes "portal-pulse" is consumed only by feature "home"; define it in home\.css/],
  );
  // Duplicate definitions are intentionally left to the uniqueness rule.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@keyframes pulse { to { opacity: 1 } }',
      "app/styles/home.css":
        "@keyframes pulse { to { opacity: .5 } }\n@utility animate-frame { @apply [animation:pulse_1s]; }",
      "features/home/card.tsx": 'const cls = "animate-frame";',
    },
    "app/styles/globals.css",
  );
  // Consumers outside feature folders prevent an otherwise local utility claim.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@import "./home.css";',
      "app/styles/home.css": "@utility retro-outline { border: 1px solid; }",
      "features/home/card.tsx": 'const cls = "retro-outline";',
      "constants/shared-classes.ts": 'export const cls = "retro-outline";',
    },
    "app/styles/home.css",
    [/CSS utility "retro-outline" is consumed across feature scopes; define it in globals\.css/],
  );
  // Font usage may be represented as an explicit inline style property.
  check(
    {
      "app/styles/globals.css": '@import "tailwindcss";\n@font-face { font-family: "Minecraft"; src: url(a.woff2); }',
      "app/styles/home.css": "@utility home-frame { display: block; }",
      "features/home/card.tsx": 'const css = { fontFamily: "Minecraft" };',
    },
    "app/styles/globals.css",
    [/CSS font face "minecraft" is consumed only by feature "home"; define it in home\.css/],
  );
});
