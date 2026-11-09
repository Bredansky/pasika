import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, tailwindRuleTester } from "./rule-tester";
import { themeTokenOrderRule } from "./theme-token-order";

function check(
  files: Record<string, string>,
  errors: RegExp[] = [],
  output?: string,
  stylesheet = "app/styles/globals.css",
): void {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-css-groups-")));
  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(root, "src", name);
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, content);
  }
  const previous = process.cwd();
  process.chdir(root);
  try {
    const filename = path.join(root, "src", stylesheet);
    const code = files[stylesheet];
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

void describe("CSS consumer group comments MUST have an associated CSS definition; orphaned group comments MUST be removed.", () => {
  check(
    {
      "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --color-frame: #222;

  /* Group: features/home/banner.tsx, features/home/menu.tsx */
}`,
      "features/home/banner.tsx": 'const cls = "bg-frame";',
    },
    [/CSS consumer group comment has no associated definition; remove the orphaned comment/u],
  );

  check(
    {
      "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --color-frame: #222;
}

/* Group: features/home/menu.tsx */`,
      "features/home/banner.tsx": 'const cls = "bg-frame";',
    },
    [/CSS consumer group comment has no associated definition; remove the orphaned comment/u],
  );

  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: features/home/banner.tsx */
  --color-frame: #222;
}`,
    "features/home/banner.tsx": 'const cls = "bg-frame";',
  });
});

void describe("CSS definitions MUST use component file paths including extensions for single consumers within each scope, or feature paths and app/compositions/shared roots for multiple consumers; mixed consumer scopes and definitions MUST be sorted alphabetically.", () => {
  check({
    "app/styles/globals.css": utility("features/home/banner.tsx"),
    "features/home/banner.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("app/components-showcase/primitives/[name]/page.tsx"),
    "app/components-showcase/primitives/[name]/page.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("features/home/banner.tsx"),
    "config/home-feed/index.ts": 'export const homeFeedConfig = { style: "effect" };',
    "features/home/banner.tsx":
      'import { homeFeedConfig } from "@/config/home-feed"; export const Banner = () => homeFeedConfig.style;',
  });

  check({
    "app/styles/globals.css": utility("features/home"),
    "config/home-feed/index.ts": 'export const homeFeedConfig = { style: "effect" };',
    "utils/home-feed.ts": 'export { homeFeedConfig } from "@/config/home-feed";',
    "features/home/banner.tsx":
      'import { homeFeedConfig } from "@/utils/home-feed"; export const Banner = () => homeFeedConfig.style;',
    "features/home/menu.tsx":
      'import { homeFeedConfig } from "@/utils/home-feed"; export const Menu = () => homeFeedConfig.style;',
  });

  check({
    "app/styles/globals.css": utility("app/global-error.tsx"),
    "app/global-error.tsx": 'const cls = "effect";',
  });

  // Framework-wide defaults have an implicit "app" fallback, not a concrete consumer.
  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: app */
  --breakpoint-sm: 40rem;
  --default-transition-duration: 150ms;
  --font-sans: Arial, sans-serif;
}`,
  });

  // A single concrete app consumer must not be hidden by the implicit fallback.
  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: app/page.tsx */
  --font-sans: Arial, sans-serif;
}`,
    "app/page.tsx": 'const cls = "font-sans";',
  });

  check(
    {
      "app/styles/globals.css": `@theme inline {
  /* Group: app */
  --font-sans: Arial, sans-serif;
}`,
      "app/page.tsx": 'const cls = "font-sans";',
    },
    [/CSS definition "--font-sans" belongs to group "app\/page.tsx", not "app"/u],
    `@theme inline {
  /* Group: app/page.tsx */
  --font-sans: Arial, sans-serif;
}`,
  );

  // Two concrete app consumers should still collapse to the "app" scope.
  check({
    "app/styles/globals.css": `@theme inline {
  /* Group: app */
  --font-sans: Arial, sans-serif;
}`,
    "app/page.tsx": 'const cls = "font-sans";',
    "app/error.tsx": 'const cls = "font-sans";',
  });

  check({
    "app/styles/globals.css": utility("app"),
    "app/global-error.tsx": 'const cls = "effect";',
    "app/error.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("app/error.tsx, features/home/banner.tsx"),
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

  // Importing a styled composition must not make the app page a CSS consumer.
  check({
    "app/styles/globals.css": utility("compositions/checkout.tsx"),
    "compositions/checkout.tsx": 'export const Checkout = () => "effect";',
    "app/page.tsx": 'import { Checkout } from "@/compositions/checkout"; export default Checkout;',
  });

  check(
    {
      "app/styles/globals.css": utility("app/page.tsx, compositions/checkout.tsx"),
      "compositions/checkout.tsx": 'export const Checkout = () => "effect";',
      "app/page.tsx": 'import { Checkout } from "@/compositions/checkout"; export default Checkout;',
    },
    [
      /CSS definition "effect" belongs to group "compositions\/checkout\.tsx", not "app\/page\.tsx, compositions\/checkout\.tsx"/u,
    ],
    utility("compositions/checkout.tsx"),
  );

  // App remains an owner when app code itself references the same style.
  check({
    "app/styles/globals.css": utility("app/page.tsx, compositions/checkout.tsx"),
    "compositions/checkout.tsx": 'export const Checkout = () => "effect";',
    "app/page.tsx":
      'import { Checkout } from "@/compositions/checkout"; const cls = "effect"; export default Checkout;',
  });

  // Transitive helpers still resolve to their nearest component consumers.
  check({
    "app/styles/globals.css": utility("compositions/checkout.tsx"),
    "utils/checkout-style.ts": 'export const checkoutStyle = "effect";',
    "compositions/checkout.tsx":
      'import { checkoutStyle } from "@/utils/checkout-style"; export const Checkout = () => checkoutStyle;',
    "app/page.tsx": 'import { Checkout } from "@/compositions/checkout"; export default Checkout;',
  });

  // A shared helper directly imported by app and a composition has both owners.
  check({
    "app/styles/globals.css": utility("app/page.tsx, compositions/checkout.tsx"),
    "utils/checkout-style.ts": 'export const checkoutStyle = "effect";',
    "compositions/checkout.tsx":
      'import { checkoutStyle } from "@/utils/checkout-style"; export const Checkout = () => checkoutStyle;',
    "app/page.tsx":
      'import { checkoutStyle } from "@/utils/checkout-style"; import { Checkout } from "@/compositions/checkout"; export default () => checkoutStyle + Checkout;',
  });

  // Importing a styled shared component should not mark its composition or page as owners.
  check({
    "app/styles/globals.css": utility("shared/button.tsx"),
    "shared/button.tsx": 'export const Button = () => "effect";',
    "compositions/checkout.tsx": 'import { Button } from "@/shared/button"; export const Checkout = Button;',
    "app/page.tsx": 'import { Checkout } from "@/compositions/checkout"; export default Checkout;',
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
    "app/styles/globals.css": utility("features/home/banner.tsx, features/player/controls.tsx"),
    "features/home/banner.tsx": 'const cls = "effect";',
    "features/player/controls.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("features/home/banner.tsx, shared/button.tsx"),
    "features/home/banner.tsx": 'const cls = "effect";',
    "shared/button.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility(
      "compositions/checkout.tsx, features/home, features/player/controls.tsx, shared/button.tsx",
    ),
    "compositions/checkout.tsx": 'const cls = "effect";',
    "features/home/banner.tsx": 'const cls = "effect";',
    "features/home/menu.tsx": 'const cls = "effect";',
    "features/player/controls.tsx": 'const cls = "effect";',
    "shared/button.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility(
      "app/page.tsx, compositions/checkout.tsx, features/home/banner.tsx, shared/button.tsx",
    ),
    "app/page.tsx": 'const cls = "effect";',
    "compositions/checkout.tsx": 'const cls = "effect";',
    "features/home/banner.tsx": 'const cls = "effect";',
    "shared/button.tsx": 'const cls = "effect";',
  });

  check({
    "app/styles/globals.css": utility("app, compositions, features/home, shared"),
    "app/page.tsx": 'const cls = "effect";',
    "app/error.tsx": 'const cls = "effect";',
    "compositions/checkout.tsx": 'const cls = "effect";',
    "compositions/receipt.tsx": 'const cls = "effect";',
    "features/home/banner.tsx": 'const cls = "effect";',
    "features/home/menu.tsx": 'const cls = "effect";',
    "shared/button.tsx": 'const cls = "effect";',
    "shared/label.tsx": 'const cls = "effect";',
  });

  check(
    {
      "app/styles/globals.css": utility("app, compositions, features/home, shared"),
      "app/page.tsx": 'const cls = "effect";',
      "compositions/checkout.tsx": 'const cls = "effect";',
      "features/home/banner.tsx": 'const cls = "effect";',
      "shared/button.tsx": 'const cls = "effect";',
    },
    [
      /CSS definition "effect" belongs to group "app\/page.tsx, compositions\/checkout.tsx, features\/home\/banner.tsx, shared\/button.tsx"/u,
    ],
    utility("app/page.tsx, compositions/checkout.tsx, features/home/banner.tsx, shared/button.tsx"),
  );

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
    [
      /CSS definition "effect" belongs to group "features\/home\/banner.tsx, features\/player\/controls.tsx", not "features\/home"/u,
    ],
    utility("features/home/banner.tsx, features/player/controls.tsx"),
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

void describe("CSS consumer groups MUST also be enforced in imported feature stylesheets.", () => {
  const stylesheet = "app/styles/minecraft.css";
  const consumer = "features/minecraft/minecraft-donation-widget.tsx";

  check(
    {
      [stylesheet]: `@theme inline {
  --color-mc-boss-canvas: #ff00ff;
}`,
      [consumer]: 'const cls = "bg-mc-boss-canvas";',
    },
    [/CSS definition "--color-mc-boss-canvas" requires group "features\/minecraft\/minecraft-donation-widget\.tsx"/u],
    undefined,
    stylesheet,
  );

  check(
    {
      [stylesheet]: `@theme inline {
  /* Group: features/minecraft/minecraft-donation-widget.tsx */
  --color-mc-boss-canvas: #ff00ff;
}`,
      [consumer]: 'const cls = "bg-mc-boss-canvas";',
    },
    [],
    undefined,
    stylesheet,
  );

  check(
    {
      [stylesheet]: `@theme inline {
  /* Group: features/minecraft */
  --color-mc-boss-canvas: #ff00ff;
}`,
      [consumer]: 'const cls = "bg-mc-boss-canvas";',
    },
    [/CSS definition "--color-mc-boss-canvas" belongs to group "features\/minecraft\/minecraft-donation-widget\.tsx"/u],
    `@theme inline {
  /* Group: features/minecraft/minecraft-donation-widget.tsx */
  --color-mc-boss-canvas: #ff00ff;
}`,
    stylesheet,
  );
});
