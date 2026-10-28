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

void describe("CSS utilities used by only one feature MUST live in that feature's stylesheet when it exists; utilities in feature-named stylesheets consumed across feature scopes MUST live in globals.css.", () => {
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
});
