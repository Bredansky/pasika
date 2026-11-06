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

void describe("CSS definitions MUST be grouped by consuming component paths or their common feature/layer paths, with mixed scopes combined and sorted alphabetically; definitions without identifiable consumers MUST remain ungrouped.", () => {
  check({
    "app/styles/globals.css": utility("features/home/banner"),
    "features/home/banner.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("features/home/card/Card"),
    "features/home/card/Card.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("shared/button"),
    "shared/button.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("compositions/checkout"),
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
    "app/styles/globals.css": "@utility unreferenced { @apply block; }",
  });

  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner */
  --color-banner-canvas: #123456;
}`,
    "features/home/banner.tsx": 'const cls = "bg-banner-canvas";',
  });

  check({
    "app/styles/globals.css":
      "@layer base { @keyframes zeta { to { opacity: 0; } } }\n@keyframes carrot { to { opacity: 0; } }",
  });

  check(
    {
      "app/styles/globals.css": utility("src/features/home/banner.tsx"),
      "features/home/banner.tsx": 'const cls = "effect";',
    },
    [/CSS definition "effect" belongs to group "features\/home\/banner", not "src\/features\/home\/banner.tsx"/u],
    utility("features/home/banner"),
  );

  check(
    {
      "app/styles/globals.css": utility("features/home/banner"),
      "features/home/banner.tsx": 'const cls = "effect";',
      "features/home/menu.tsx": 'const cls = "effect";',
    },
    [/CSS definition "effect" belongs to group "features\/home", not "features\/home\/banner"/u],
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
      "app/styles/globals.css": "/* Group: global */\n@utility unreferenced { @apply block; }",
    },
    [/Global CSS definitions must not have a group comment/u],
    "@utility unreferenced { @apply block; }",
  );

  check(
    {
      "app/styles/globals.css": `${utility("features/zeta/item", "zed")}\n${utility("features/alpha/item", "alpha")}`,
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
      "app/styles/globals.css": "@theme inline { --color-z: white; --color-a: black; }",
    },
    [/CSS definitions in group "global" must be alphabetical/u],
  );
});
