import css from "@eslint/css";
import { Linter } from "eslint";
import { expect, it } from "vitest";
import { describe, tailwindRuleTester } from "./rule-tester";
import { utilityNameParityRule } from "./utility-name-parity";

void describe("A static custom `@utility` MUST use a name derived from its CSS property and value, including units.", () => {
  tailwindRuleTester.run("utility-name-parity", utilityNameParityRule, {
    valid: [
      { code: "@utility bg-size-200pct-100pct { @apply [background-size:200%_100%]; }" },
      { code: "@utility bg-size-24px-24px { @apply [background-size:24px_24px]; }" },
      { code: "@utility border-style-outset { @apply [border-style:outset]; }" },
      { code: "@utility grid-template-columns-2fr-1fr { @apply [grid-template-columns:2fr_1fr]; }" },
      { code: "@utility mask-image-var-art { @apply mask-[var(--art)]; }" },
      { code: "@utility font-weight-var-family { @apply font-(--family); }" },
      {
        code: "@utility mask-image-var-art { @apply mask-[var(--art)]; } @utility grid-template-columns-2fr-1fr { @apply grid-cols-[2fr_1fr]; }",
      },
      { code: "@utility border-top-color-hex-8b8b8b { @apply [border-top-color:#8b8b8b]; }" },
      { code: "@utility z-index-neg-1 { @apply [z-index:-1]; }" },
      { code: "@utility height-3px { @apply h-[3px]; }" },
      { code: "@utility font-size-14px { @apply text-[14px]; }" },
      { code: "@utility color-hex-f00 { @apply text-[#f00]; }" },
      { code: "@utility bg-color-hex-abc { @apply bg-[#abc]; }" },
      { code: "@utility font-family-var-interface { @apply font-(family-name:--interface); }" },
      { code: "@utility font-weight-var-weight { @apply font-(number:--weight); }" },
      { code: "@utility color-var-ink { @apply text-(color:--ink); }" },
      { code: "@utility color-var-ink { @apply text-[color:var(--ink)]; }" },
      { code: "@utility font-size-var-body { @apply text-[length:var(--body)]; }" },
      { code: "@utility bg-image-var-art { @apply bg-[image:var(--art)]; }" },
      { code: "@utility bg-image-var-art { @apply bg-(image:--art); }" },
      { code: "@utility bg-color-var-canvas { @apply bg-[color:var(--canvas)]; }" },
      { code: "@utility bg-color-var-canvas { @apply bg-(color:--canvas); }" },
      { code: "@utility bg-size-24px-24px { @apply bg-[size:24px_24px]; }" },
      { code: "@utility bg-size-var-pattern { @apply bg-(size:--pattern); }" },
      { code: "@utility bg-position-20pct-40pct { @apply bg-[position:20%_40%]; }" },
      { code: "@utility bg-position-var-position { @apply bg-(position:--position); }" },
      { code: "@utility height-var-banner { @apply h-(--banner); }" },
      { code: "@utility opacity-0p25 { @apply [opacity:.25]; }" },
      {
        code: "@utility transition-property-color-comma-border-color { @apply [transition-property:color,_border-color]; }",
      },
      { code: "@utility font-size-var-font-size { @apply text-(length:--font-size); }" },
      { code: "@utility webkit-font-smoothing-none { @apply [-webkit-font-smoothing:none]; }" },
      { code: "@utility will-change-transform-comma-opacity { @apply [will-change:transform,_opacity]; }" },
      { code: "@utility opacity-0p5 { @apply [opacity:0.5]; }" },
      { code: "@utility toolbar-* { width: --value(--toolbar-*); }" },
      { code: "@utility multi { @apply h-[3px]; @apply w-[4px]; }" },
      { code: "@theme { --background-image-rainbow-gradient-canvas: linear-gradient(red, blue); }" },
    ],
    invalid: [
      {
        code: "@utility shadow-one { @apply shadow-[0_0_12px_rgba(0,0,0,0.5)]; } @utility shadow-two { @apply shadow-[0_0_24px_rgba(0,0,0,0.5)]; }",
        errors: [
          { message: /maps box-shadow: 0 0 12px .*; rename it "box-shadow-hash-[a-f0-9]{12}"/u },
          { message: /maps box-shadow: 0 0 24px .*; rename it "box-shadow-hash-[a-f0-9]{12}"/u },
        ],
      },
      {
        code: "@utility bg-rainbow-gradient-size { @apply [background-size:200%_100%]; }",
        errors: [
          {
            message:
              'Custom utility "bg-rainbow-gradient-size" maps background-size: 200% 100%; rename it "bg-size-200pct-100pct" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility bg-grid-size { @apply [background-size:12px_6px]; }",
        errors: [
          {
            message:
              'Custom utility "bg-grid-size" maps background-size: 12px 6px; rename it "bg-size-12px-6px" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility border-outset { @apply [border-style:outset]; }",
        errors: [
          {
            message:
              'Custom utility "border-outset" maps border-style: outset; rename it "border-style-outset" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility css-grid-template-columns-2fr-1fr { @apply [grid-template-columns:2fr_1fr]; }",
        errors: [
          {
            message:
              'Custom utility "css-grid-template-columns-2fr-1fr" maps grid-template-columns: 2fr 1fr; rename it "grid-template-columns-2fr-1fr" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility mask-art { @apply mask-[var(--art)]; }",
        errors: [
          {
            message:
              'Custom utility "mask-art" maps mask-image: var(--art); rename it "mask-image-var-art" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility grid-cols-2fr-1fr { @apply [grid-template-columns:2fr_1fr]; }",
        errors: [
          {
            message:
              'Custom utility "grid-cols-2fr-1fr" maps grid-template-columns: 2fr 1fr; rename it "grid-template-columns-2fr-1fr" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility layer-dialog { @apply [z-index:60]; }",
        errors: [
          {
            message:
              'Custom utility "layer-dialog" maps z-index: 60; rename it "z-index-60" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility font-smoothing-pixel { @apply [-webkit-font-smoothing:none]; }",
        errors: [
          {
            message:
              'Custom utility "font-smoothing-pixel" maps -webkit-font-smoothing: none; rename it "webkit-font-smoothing-none" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility h-starfield { @apply h-[min(700px,90vw)]; }",
        errors: [
          {
            message:
              /^Custom utility "h-starfield" maps height: min\(700px, 90vw\); rename it "height-min-hash-[a-f0-9]{12}" to preserve property\/value parity\.$/u,
          },
        ],
      },
      {
        code: "@utility filter-border-glow { @apply [filter:drop-shadow(0_0_15px_hsl(var(--primary)_/_0.6))]; }",
        errors: [
          {
            message:
              /^Custom utility "filter-border-glow" maps filter: drop-shadow.* rename it "filter-drop-shadow-hash-[a-f0-9]{12}" to preserve property\/value parity\.$/u,
          },
        ],
      },
      {
        code: "@utility bg-frame-glow { @apply bg-[linear-gradient(135deg,red,blue)]; }",
        errors: [
          {
            message:
              /^Custom utility "bg-frame-glow" maps background-image: linear-gradient.* rename it "bg-image-linear-gradient-hash-[a-f0-9]{12}" to preserve property\/value parity\.$/u,
          },
        ],
      },
      {
        code: "@utility font-mc { @apply [font-family:var(--font-space-mono),_monospace]; }",
        errors: [
          {
            message:
              'Custom utility "font-mc" maps font-family: var(--font-space-mono), monospace; rename it "font-family-var-font-space-mono-comma-monospace" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility animate-float { @apply [animation:float_3s_linear_infinite]; }",
        errors: [
          {
            message:
              'Custom utility "animate-float" maps animation: float 3s linear infinite; rename it "animation-float-3s-linear-infinite" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility text-dynamic { @apply text-(length:--font-size); }",
        errors: [
          {
            message:
              'Custom utility "text-dynamic" maps font-size: var(--font-size); rename it "font-size-var-font-size" to preserve property/value parity.',
          },
        ],
      },
      {
        code: "@utility unknown-text-color { @apply text-[var(--ink)]; }",
        errors: [{ message: /maps color: var\(--ink\); rename it "color-var-ink"/u }],
      },
      {
        code: "@utility unknown-bg-type { @apply bg-[var(--canvas)]; }",
        errors: [{ message: /maps background-color: var\(--canvas\); rename it "bg-color-var-canvas"/u }],
      },
      {
        code: "@utility unknown-text-var { @apply text-(--ink); }",
        errors: [{ message: /maps color: var\(--ink\); rename it "color-var-ink"/u }],
      },
      {
        code: "@utility unknown-bg-var { @apply bg-(--canvas); }",
        errors: [{ message: /maps background-color: var\(--canvas\); rename it "bg-color-var-canvas"/u }],
      },
      {
        code: "@utility unknown-font-var { @apply font-(--family); }",
        errors: [{ message: /maps font-weight: var\(--family\); rename it "font-weight-var-family"/u }],
      },
      {
        code: "@utility unknown-bg-hint { @apply bg-(depth:--depth); }",
        errors: [{ message: /maps background-color: var\(--depth\); rename it "bg-color-var-depth"/u }],
      },
      {
        code: "@utility unknown-prefix { @apply foo-[18px]; }",
        errors: [{ message: /Tailwind cannot resolve exactly one CSS property/u }],
      },
      {
        code: "@utility unknown-variable { @apply foo-(--unknown); }",
        errors: [{ message: /Tailwind cannot resolve exactly one CSS property/u }],
      },
      {
        code: "@utility unknown-words { @apply [animation:a_b_c_d_e_f_g_h_i]; }",
        errors: [{ message: /animation-hash-[a-f0-9]{12}/u }],
      },
      {
        code: "@utility unknown-long { @apply [font-family:veryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryverylong]; }",
        errors: [{ message: /font-family-hash-[a-f0-9]{12}/u }],
      },
      {
        code: "@utility bg-photo { @apply bg-[url(hero.png)]; }",
        errors: [{ message: /bg-image-url-hash-[a-f0-9]{12}/u }],
      },
      {
        code: "@utility combined-size { @apply h-[3px] w-[4px]; }",
        errors: [{ message: /Tailwind cannot resolve exactly one CSS property/u }],
      },
      {
        code: "@utility bg-size-12px-12px { @apply [background-size:12px_6px]; }",
        errors: [
          {
            message:
              'Custom utility "bg-size-12px-12px" maps background-size: 12px 6px; rename it "bg-size-12px-6px" to preserve property/value parity.',
          },
        ],
      },
    ],
  });
});

void describe("Tailwind compiler error handling", () => {
  function lintWithNodeOptions(code: string, nodeOptions: string): string[] {
    const original = process.env.NODE_OPTIONS;
    process.env.NODE_OPTIONS = nodeOptions;
    try {
      const linter = new Linter();
      const messages = linter.verify(
        code,
        [
          {
            files: ["**/*.css"],
            plugins: { css, pasika: { rules: { "utility-name-parity": utilityNameParityRule } } },
            language: "css/css",
            languageOptions: { tolerant: true },
            rules: { "pasika/utility-name-parity": "error" },
          },
        ],
        { filename: "probe.css" },
      );
      return messages.map((message) => message.message);
    } finally {
      if (original === undefined) delete process.env.NODE_OPTIONS;
      else process.env.NODE_OPTIONS = original;
    }
  }

  it("reports a Tailwind subprocess failure instead of crashing ESLint", () => {
    const messages = lintWithNodeOptions(
      "@utility worker-failed { @apply [height:19px]; }",
      "--pasika-invalid-node-option",
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Tailwind cannot resolve exactly one CSS property");
  });

  it("rejects malformed compiler responses rather than trusting their output", () => {
    const preload = "process.stdout.write('bad');process.exit(0)";
    const messages = lintWithNodeOptions(
      "@utility worker-invalid { @apply [height:23px]; }",
      `--import=data:text/javascript,${encodeURIComponent(preload)}`,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Invalid Tailwind compiler response");
  });

  it("rejects a non-array compiler response", () => {
    const preload = "process.stdout.write('{}');process.exit(0)";
    const messages = lintWithNodeOptions(
      "@utility worker-not-array { @apply [height:31px]; }",
      `--import=data:text/javascript,${encodeURIComponent(preload)}`,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Invalid Tailwind compiler response");
  });

  it("rejects an array containing invalid compiler results", () => {
    const preload = "process.stdout.write('[null]');process.exit(0)";
    const messages = lintWithNodeOptions(
      "@utility worker-invalid-array { @apply [height:29px]; }",
      `--import=data:text/javascript,${encodeURIComponent(preload)}`,
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("Invalid Tailwind compiler response");
  });
});
