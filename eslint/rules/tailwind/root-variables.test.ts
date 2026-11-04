import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { rootVariablesRule } from "./root-variables";
import { describe, tailwindRuleTester } from "./rule-tester";

const INLINE_ONLY = "Define all Tailwind theme tokens in @theme inline, including fixed values and resets.";
const mapping = (name: string): string =>
  `Tailwind token "${name}" must use a fixed value, same-named var(${
    name
  }), or an external var() with fallback in @theme inline.`;
const redundant = (name: string): string =>
  `Tailwind token "${name}" has no @variant override; define its fixed value directly in @theme inline.`;
const wrong = (token: string, variable: string): string =>
  `Tailwind token "${token}" must reference its same-named CSS variable, not "${variable}".`;
const missingDefault = (name: string): string =>
  `Tailwind token "${name}" references "${name}" without a default :root declaration.`;
const rootDuplicate = (name: string): string =>
  `Token "${name}" is already defined in @theme; remove its duplicate default :root declaration.`;
const tokenOverride = (name: string): string =>
  `Tailwind token "${
    name
  }" must not be redeclared outside @theme; map it through @theme inline to its same-named runtime variable instead.`;

void describe("Every Tailwind theme token, including fixed values and the default theme reset, MUST use `@theme inline`.", () => {
  tailwindRuleTester.run("root-variables-inline-only", rootVariablesRule, {
    valid: [
      { code: "@theme inline { --*: initial; }" },
      { code: "@theme inline { --color-brand-canvas: #2563eb; --radius-base: 8px; }" },
      { code: "@theme inline { --color-base-ink: #fafafa; --text-xs: 0.75rem; --font-label: Arial, sans-serif; }" },
      { code: "@theme inline { --color-brand-canvas: #2563eb; /* --color-ghost: var(--missing); */ }" },
      { code: "@theme inline { --font-label: 'var(--literal)'; }" },
      { code: "@theme inline { --radius-base: 8px; --radius-chip: 10px; --radius-button: 12px; }" },
      { code: "@theme inline { --color-brand-canvas: #2563eb; --shadow-brand: 0 0 3px var(--color-brand-canvas); }" },
      {
        code: "@theme inline { --color-brand-canvas: #2563eb; --shadow-brand: 0 0 3px color-mix(in srgb, var(--color-brand-canvas) 30%, transparent); }",
      },
      {
        code: ":root { --color-primary-canvas: #fff; @variant dark { --color-primary-canvas: #000; } } @theme inline { --color-primary-canvas: var(--color-primary-canvas); --shadow-card: 0 0 3px var(--color-primary-canvas); --background-image-card-canvas: linear-gradient(var(--color-primary-canvas), transparent); }",
      },
      {
        code: "@theme inline { --color-brand-canvas: var(--vendor-brand, #2563eb); --inset-shadow-brand: inset 0 1px 2px var(--color-brand-canvas); }",
      },
      { code: "@theme inline { --brand-hue: 270 70% 50%; --color-brand-canvas: hsl(var(--brand-hue)); }" },
      {
        code: "@theme inline { --color-line-canvas: #334155; --background-image-lines-canvas: repeating-linear-gradient(0deg, transparent 0 2px, var(--color-line-canvas) 2px 4px); }",
      },
      {
        code: "@theme inline { --animate-wiggle: wiggle 2s ease-in-out infinite; @keyframes wiggle { to { transform: rotate(3deg); } } }",
      },
    ],
    invalid: [
      { code: "@theme { --*: initial; }", errors: [{ message: INLINE_ONLY }] },
      { code: "@theme { --radius-base: 8px; }", errors: [{ message: INLINE_ONLY }] },
      {
        code: "@theme { --color-brand-canvas: #2563eb; @keyframes wiggle { to { opacity: 0.5; } } }",
        errors: [{ message: INLINE_ONLY }],
      },
      {
        code: "@theme { --color-brand-canvas: red; } @theme inline { --font-sans: var(--font-loader, Arial); }",
        errors: [{ message: INLINE_ONLY }],
      },
      {
        code: "@theme inline { --color-brand-canvas: blue; } @theme { --radius-base: 8px; }",
        errors: [{ message: INLINE_ONLY }],
      },
      {
        code: "@theme inline { --radius-base: 8px; --radius-button: var(--radius-base); }",
        errors: [{ message: wrong("--radius-button", "--radius-base") }],
      },
      {
        code: "@theme inline { --color-brand-canvas: blue; --color-brand-edge: var(--color-brand-canvas); }",
        errors: [{ message: wrong("--color-brand-edge", "--color-brand-canvas") }],
      },
      {
        code: "@theme inline { --radius-base: var(--other); }",
        errors: [{ message: wrong("--radius-base", "--other") }],
      },
      {
        code: "@theme inline { --color-surface: hsl(var(--unknown)); }",
        errors: [{ message: mapping("--color-surface") }],
      },
      {
        code: ":root { --color-primary-canvas: #fff; @variant dark { --color-primary-canvas: #000; } } @theme inline { --color-primary-canvas: var(--color-primary-canvas); --color-derived-canvas: hsl(var(--color-primary-canvas)); }",
        errors: [{ message: mapping("--color-derived-canvas") }],
      },
      {
        code: "@theme inline { --alpha: hsl(var(--beta)); --beta: hsl(var(--alpha)); }",
        errors: [{ message: mapping("--alpha") }, { message: mapping("--beta") }],
      },
    ],
  });
});

void describe("Only tokens with `@variant` overrides MUST map to a same-named `var()` in `@theme inline`, backed by a default `:root` declaration and matching `@variant` overrides.", () => {
  tailwindRuleTester.run("root-variables-variant-runtime", rootVariablesRule, {
    valid: [
      {
        code: ":root { --color-primary-canvas: white; @variant dark { --color-primary-canvas: black; } } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
      },
      {
        code: ":root { --radius-card: 8px; @variant compact { --radius-card: 4px; } } @theme inline { --radius-card: var(--radius-card); }",
      },
      {
        code: ":root { --font-body: Arial; @variant midnight { --font-body: Georgia; } } @theme inline { --font-body: var(--font-body); }",
      },
      {
        code: ":root { --color-primary-canvas: #fff; } @variant dark { :root { --color-primary-canvas: #000; } } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
      },
      {
        code: ":root { --spacing-panel: 24px; --shadow-panel: 0 0 2px blue; @variant compact { --spacing-panel: 16px; --shadow-panel: 0 0 2px red; } } @theme inline { --spacing-panel: var(--spacing-panel); --shadow-panel: var(--shadow-panel); }",
      },
      {
        code: ":root { --animate-enter: enter 200ms; @variant reduced { --animate-enter: none; } } @theme inline { --animate-enter: var(--animate-enter); }",
      },
      {
        code: "@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *)); :root { --color-primary-canvas: #fff; @variant dark { --color-primary-canvas: #000; } } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
      },
      {
        code: ":root { --color-primary-canvas: #fff; @variant dark { --color-primary-canvas: #000; } } @theme inline { --*: initial; --color-primary-canvas: var(--color-primary-canvas); --radius-base: 8px; }",
      },
    ],
    invalid: [
      {
        code: "@theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
        errors: [{ message: missingDefault("--color-primary-canvas") }],
      },
      {
        code: ":root { --color-primary-canvas: #fff; } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
        errors: [{ message: redundant("--color-primary-canvas") }],
      },
      {
        code: ":root { --radius-card: 8px; } .dark { --radius-card: 4px; } @theme inline { --radius-card: var(--radius-card); }",
        errors: [{ message: redundant("--radius-card") }],
      },
      {
        code: ":root { --radius-card: 8px; @variant compact { --radius-card: 4px; } } .dark { --radius-card: 6px; } @theme inline { --radius-card: var(--radius-card); }",
        errors: [{ message: tokenOverride("--radius-card") }],
      },
      {
        code: ":root { --radius-card: 8px; } [data-theme='dark'] { --radius-card: 4px; } @theme inline { --radius-card: var(--radius-card); }",
        errors: [{ message: redundant("--radius-card") }],
      },
      {
        code: ":root { --radius-card: 8px; } @media (prefers-color-scheme: dark) { :root { --radius-card: 4px; } } @theme inline { --radius-card: var(--radius-card); }",
        errors: [{ message: redundant("--radius-card") }],
      },
      {
        code: "@variant dark { :root { --radius-card: 4px; } } @theme inline { --radius-card: var(--radius-card); }",
        errors: [{ message: missingDefault("--radius-card") }],
      },
      {
        code: ":root { --radius-card: 8px; } @theme inline { --radius-card: var(--radius-card, 8px); }",
        errors: [{ message: rootDuplicate("--radius-card") }, { message: mapping("--radius-card") }],
      },
      {
        code: ":root { --radius-card: 8px; } @theme inline { --radius-card: calc(var(--radius-card) + 2px); }",
        errors: [{ message: rootDuplicate("--radius-card") }, { message: mapping("--radius-card") }],
      },
    ],
  });
});

void describe("Tokens without their own `@variant` overrides MUST define fixed values or composite effects in `@theme inline`, or map to external CSS variables with nonempty literal `var()` fallbacks.", () => {
  tailwindRuleTester.run("root-variables-external", rootVariablesRule, {
    valid: [
      { code: "@theme inline { --font-sans: var(--font-inter, Arial); }" },
      { code: "@theme inline { --font-mono: var(--vendor-mono, ui-monospace, monospace); }" },
      { code: "@theme inline { --color-brand-canvas: var(--vendor-color, #2563eb); }" },
      { code: "@theme inline { --radius-button: var(--vendor-radius, 8px); }" },
      { code: "@theme inline { --shadow-soft: var(--vendor-shadow, 0 0 2px rgb(0 0 0 / 20%)); }" },
      {
        code: "@theme inline { --radius-base: 8px; --font-sans: var(--font-inter, Arial); --color-brand-canvas: var(--vendor-color, #2563eb); }",
      },
    ],
    invalid: [
      {
        code: "@theme inline { --font-sans: var(--font-inter); }",
        errors: [{ message: wrong("--font-sans", "--font-inter") }],
      },
      { code: "@theme inline { --font-sans: var(--font-inter, ); }", errors: [{ message: mapping("--font-sans") }] },
      {
        code: "@theme inline { --font-sans: var(--font-inter, Arial), sans-serif; }",
        errors: [{ message: mapping("--font-sans") }],
      },
      {
        code: "@theme inline { --font-sans: var(--font-inter, var(--font-system, Arial)); }",
        errors: [{ message: mapping("--font-sans") }],
      },
      {
        code: ":root { --vendor-color: red; } @theme inline { --color-brand-canvas: var(--vendor-color, blue); }",
        errors: [{ message: mapping("--color-brand-canvas") }],
      },
      {
        code: "[data-theme='dark'] { --vendor-color: red; } @theme inline { --color-brand-canvas: var(--vendor-color, blue); }",
        errors: [{ message: mapping("--color-brand-canvas") }],
      },
      {
        code: "@theme inline { --radius-base: 8px; --radius-button: var(--radius-base, 10px); }",
        errors: [{ message: mapping("--radius-button") }],
      },
    ],
  });
});

void describe("Fixed theme tokens MUST NOT be overridden outside `@theme inline`.", () => {
  tailwindRuleTester.run("root-variables-redeclarations", rootVariablesRule, {
    valid: [
      { code: "@theme inline { --color-primary-canvas: #fff; }" },
      {
        code: ":root { --color-primary-canvas: #fff; @variant dark { --color-primary-canvas: #000; } } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
      },
      { code: "@media (prefers-color-scheme: dark) { :root { --card-radius: 12px; } }" },
    ],
    invalid: [
      {
        code: "@theme inline { --color-primary-canvas: #fff; } :root { --color-primary-canvas: #fff; }",
        errors: [{ message: rootDuplicate("--color-primary-canvas") }],
      },
      {
        code: "@theme inline { --color-primary-canvas: #fff; } [data-theme='dark'] { --color-primary-canvas: #000; }",
        errors: [{ message: tokenOverride("--color-primary-canvas") }],
      },
      {
        code: "@theme inline { --radius-card: 8px; } :root { @variant compact { --radius-card: 4px; } }",
        errors: [{ message: tokenOverride("--radius-card") }],
      },
      {
        code: "@theme inline { --radius-card: 8px; } @variant compact { --radius-card: 4px; }",
        errors: [{ message: tokenOverride("--radius-card") }],
      },
      {
        code: "@theme inline { --radius-card: 8px; } @media (max-width: 600px) { :root { --radius-card: 4px; } }",
        errors: [{ message: tokenOverride("--radius-card") }],
      },
    ],
  });
});

void describe("A theme token MUST NOT directly alias a different theme token through `var()`.", () => {
  const fixture = realpathSync(mkdtempSync(path.join(tmpdir(), "pasika-inline-only-")));
  const filename = (name: string): string => path.join(fixture, "src/app/styles", name);
  mkdirSync(path.dirname(filename("globals.css")), { recursive: true });
  writeFileSync(
    filename("tokens.css"),
    ":root { --color-primary-canvas: #fff; --vendor-color: blue; --radius-programmatic: 8px; @variant dark { --color-primary-canvas: #000; } }",
  );
  writeFileSync(
    path.join(fixture, "src/app/page.tsx"),
    'document.documentElement.style.setProperty("--radius-programmatic", "10px");',
  );
  const originalDirectory = process.cwd();
  process.chdir(fixture);
  try {
    tailwindRuleTester.run("root-variables-cross-file", rootVariablesRule, {
      valid: [
        {
          filename: filename("globals.css"),
          code: "@theme inline { --color-primary-canvas: var(--color-primary-canvas); --shadow-card: 0 0 3px var(--color-primary-canvas); --radius-base: 8px; --font-sans: var(--font-loader, Arial); }",
        },
      ],
      invalid: [
        { filename: filename("globals.css"), code: "@theme { --*: initial; }", errors: [{ message: INLINE_ONLY }] },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --color-primary-canvas: var(--other); }",
          errors: [{ message: wrong("--color-primary-canvas", "--other") }],
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --color-brand-canvas: var(--vendor-color, red); }",
          errors: [{ message: mapping("--color-brand-canvas") }],
        },
        {
          filename: filename("globals.css"),
          code: "@theme inline { --radius-programmatic: var(--radius-programmatic); }",
          errors: [{ message: redundant("--radius-programmatic") }],
        },
      ],
    });
  } finally {
    process.chdir(originalDirectory);
  }
});

void describe("Tokens without their own `@variant` overrides MUST define fixed values or composite effects in `@theme inline`, or map to external CSS variables with nonempty literal `var()` fallbacks.", () => {
  tailwindRuleTester.run("root-variables-three-value-forms", rootVariablesRule, {
    valid: [
      { code: "@theme inline { --radius-base: 8px; --font-sans: var(--font-inter, Arial); }" },
      {
        code: ":root { --color-primary-canvas: #fff; @variant dark { --color-primary-canvas: #000; } } @theme inline { --color-primary-canvas: var(--color-primary-canvas); }",
      },
      { code: "@theme inline { --color-brand-canvas: #2563eb; --shadow-brand: 0 0 3px var(--color-brand-canvas); }" },
    ],
    invalid: [
      {
        code: "@theme inline { --radius-base: 8px; --radius-button: var(--radius-base); }",
        errors: [{ message: wrong("--radius-button", "--radius-base") }],
      },
      {
        code: "@theme inline { --font-sans: var(--font-inter); }",
        errors: [{ message: wrong("--font-sans", "--font-inter") }],
      },
    ],
  });
});
