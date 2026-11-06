import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { themeTokenOrderRule } from "./theme-token-order";

function check(files: Record<string, string>, errors: RegExp[] = [], output?: string): void {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-css-groups-")));
  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(root, "src", name);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }
  const previous = process.cwd();
  process.chdir(root);
  try {
    const filename = path.join(root, "src", "app", "styles", "globals.css");
    const code = files["app/styles/globals.css"];
    if (code === undefined) throw new Error("CSS fixture missing");
    tailwindRuleTester.run("theme-token-order", themeTokenOrderRule, {
      valid: errors.length === 0 ? [{ filename, code }] : [],
      invalid:
        errors.length > 0
          ? [
              {
                filename,
                code,
                errors: errors.map((message) => ({ message })),
                ...(output === undefined ? {} : { output }),
              },
            ]
          : [],
    });
  } finally {
    process.chdir(previous);
  }
}

function utility(group: string, name = "effect"): string {
  return `/* Group: ${group} */\n@utility ${name} { @apply block; }`;
}

void describe("CSS definitions MUST be grouped by their consumers: use the component file path including its extension for one consumer, the feature path when multiple consumers share a feature, and sorted combinations of feature, shared, or composition paths when consumers span scopes; sort groups and definitions alphabetically.", () => {
  check({
    "app/styles/globals.css": utility("features/home/banner.tsx"),
    "features/home/banner.tsx": 'const cls = "effect";',
  });
  check({
    "app/styles/globals.css": utility("app/global-error.tsx"),
    "app/global-error.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("app"),
    "app/global-error.tsx": 'const cls = "effect";',
    "app/error.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("app, features/home"),
    "app/error.tsx": 'const cls = "effect";',
    "features/home/banner.tsx": 'const cls = "effect";',
  });


  check({
    "app/styles/globals.css": utility("features/home/card/Card.tsx"),
    "features/home/card/Card.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("shared/button.tsx"),
    "shared/button.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("shared/link.jsx"),
    "shared/link.jsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("compositions/checkout.tsx"),
    "compositions/checkout.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("features/home"),
    "features/home/banner.tsx": 'const cls = "effect";',
    "features/home/menu.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("shared"),
    "shared/button.tsx": 'const cls = "effect";',
    "shared/label.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("compositions"),
    "compositions/checkout.tsx": 'const cls = "effect";',
    "compositions/receipt.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("features/home, features/player"),
    "features/home/banner.tsx": 'const cls = "effect";',
    "features/player/controls.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("features/home, shared"),
    "features/home/banner.tsx": 'const cls = "effect";',
    "shared/button.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("compositions, features/home, features/player, shared"),
    "compositions/checkout.tsx": 'const cls = "effect";',
    "features/home/banner.tsx": 'const cls = "effect";',
    "features/home/menu.tsx": 'const cls = "effect";',
    "features/player/controls.tsx": 'const cls = "effect";',
    "shared/button.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --color-banner-canvas: #123456;
}`,
    "features/home/banner.tsx": 'const cls = "bg-banner-canvas";',
  });

  check(
    {
      "app/styles/globals.css": utility("src/features/home/banner.tsx"),
      "features/home/banner.tsx": 'const cls = "effect";',
    },
    [/CSS definition "effect" belongs to group "features\/home\/banner.tsx", not "src\/features\/home\/banner.tsx"/u],
    utility("features/home/banner.tsx"),
  );

  check(
    {
      "app/styles/globals.css": utility("features/home/banner"),
      "features/home/banner.tsx": 'const cls = "effect";',
    },
    [/CSS definition "effect" belongs to group "features\/home\/banner.tsx", not "features\/home\/banner"/u],
    utility("features/home/banner.tsx"),
  );

  check(
    {
      "app/styles/globals.css": utility("features/home/banner.tsx"),
      "features/home/banner.tsx": 'const cls = "effect";',
      "features/home/menu.tsx": 'const cls = "effect";',
    },
    [/CSS definition "effect" belongs to group "features\/home", not "features\/home\/banner.tsx"/u],
    utility("features/home"),
  );

  check(
    {
      "app/styles/globals.css": utility("features/home"),
      "features/home/banner.tsx": 'const cls = "effect";',
      "features/player/controls.tsx": 'const cls = "effect";',
    },
    [/CSS definition "effect" belongs to group "features\/home, features\/player", not "features\/home"/u],
    utility("features/home, features/player"),
  );

  check(
    {
      "app/styles/globals.css": `${utility("features/zeta/item.tsx", "zed")}\n${utility("features/alpha/item.tsx", "alpha")}`,
      "features/zeta/item.tsx": 'const cls = "zed";',
      "features/alpha/item.tsx": 'const cls = "alpha";',
    },
    [/CSS consumer groups in utility must be ordered alphabetically by path/u],
  );

  check(
    {
      "app/styles/globals.css": `/* Group: features/home */
@utility zebra { @apply block; }
@utility apple { @apply block; }`,
      "features/home/banner.tsx": 'const cls = "zebra apple";',
      "features/home/menu.tsx": 'const cls = "zebra apple";',
    },
    [/CSS definitions in group "features\/home" must be alphabetical/u],
  );

  check(
    {
      "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --color-z: white;
  --color-a: black;
}`,
      "features/home/banner.tsx": 'const cls = "bg-z text-a";',
    },
    [/CSS definitions in group "features\/home\/banner.tsx" must be alphabetical/u],
  );
  // Tailwind-generated utility classes must identify both their token and
  // any metadata implicitly associated with that token.
  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --text-compact: 0.875rem;
  --text-compact--line-height: 1.25;
}`,
    "features/home/banner.tsx": 'const cls = "text-compact";',
  });

  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --color-frame: #222222;
  --shadow-panel: 0 2px 4px var(--color-frame);
}`,
    "features/home/banner.tsx": 'const cls = "shadow-panel";',
  });

  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --color-spot: #345678;
}`,
    "app/styles/home.css": "@utility spot { @apply bg-spot; }",
    "features/home/banner.tsx": 'const cls = "spot";',
  });

  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --animate-intro: intro 0.5s linear;
}
/* Group: features/home/banner.tsx */
@keyframes intro { to { opacity: 1; } }`,
    "features/home/banner.tsx": 'const cls = "animate-intro";',
  });

  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --color-panel: var(--color-panel);
}
:root {
  /* Group: features/home/banner.tsx */
  --color-panel: #abcdef;
}`,
    "features/home/banner.tsx": 'const cls = "bg-panel";',
  });

  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: app */
  --color-base-canvas: white;
  --spacing: 0.25rem;
}
@layer base {
  body { @apply bg-base-canvas; }
}`,
  });

  // Unknown consumers must produce diagnostics, not silently ungrouped CSS.
  check({ "app/styles/globals.css": "@utility unreferenced { @apply block; }" }, [
    /CSS definition "unreferenced" has no traceable consumer; reference it or remove it/u,
  ]);

  check({ "app/styles/globals.css": "/* Group: global */\n@utility unreferenced { @apply block; }" }, [
    /CSS definition "unreferenced" has no traceable consumer; reference it or remove it/u,
  ]);
});
