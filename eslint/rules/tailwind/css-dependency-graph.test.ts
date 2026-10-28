import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCssDependencyGraph, cssSymbolUsages } from "./css-dependency-graph";

const root = path.resolve("fixtures/css-project/src");
const globals = path.join(root, "app/styles/globals.css");
const tokens = path.join(root, "app/styles/tokens.css");
const minecraft = path.join(root, "app/styles/utilities-minecraft.css");
const component = path.join(root, "features/banner.tsx");
const constants = path.join(root, "constants/control-classes.ts");

describe("Cross-file CSS definitions and consumers share a single dependency graph.", () => {
  const graph = buildCssDependencyGraph({
    sourceRoot: root,
    css: [
      {
        path: globals,
        content: '@import "tailwindcss";\n@import "./tokens.css";\n@import "./utilities-minecraft.css";',
      },
      {
        path: tokens,
        content: ":root { --retro-text-size: 8px; }\n@theme inline { --text-retro-8: var(--retro-text-size); }",
      },
      {
        path: minecraft,
        content:
          "@utility bg-mc-button-surface { @apply [background-color:red]; }\n" +
          "@keyframes sparkle { from {opacity:0} to {opacity:1} }\n" +
          "@utility animate-sparkle { @apply [animation:sparkle_1s_linear]; }",
      },
    ],
    modules: [
      { path: constants, content: 'export const cls = "bg-mc-button-surface";' },
      { path: component, content: 'const cls = "text-retro-8 animate-sparkle";' },
    ],
  });

  it("supports definition-only indexing for structural rules", () => {
    const definitionsOnly = buildCssDependencyGraph({
      sourceRoot: root,
      css: [{ path: tokens, content: "@theme { --radius-card: 0.5rem; }" }],
      modules: [{ path: component, content: 'const cls = "rounded-card";' }],
      includeReferences: false,
    });
    expect(definitionsOnly.definitions).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "theme-token", name: "--radius-card" })]),
    );
    expect(definitionsOnly.references).toEqual([]);
  });

  it("connects a theme variable to its CSS definition and module-generated class", () => {
    expect(graph.definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "root-variable", name: "--retro-text-size", file: tokens }),
        expect.objectContaining({ kind: "theme-token", name: "--text-retro-8", file: tokens }),
      ]),
    );
    expect(cssSymbolUsages(graph, "variable", "--retro-text-size")).toEqual([
      expect.objectContaining({ file: tokens, source: "css" }),
    ]);
    expect(cssSymbolUsages(graph, "theme-class", "text-retro-8")).toEqual([
      expect.objectContaining({ file: component, source: "module" }),
    ]);
  });

  it("finds direct CSS imports and custom utility usage across source modules", () => {
    expect(graph.imports).toEqual([
      { from: globals, to: tokens },
      { from: globals, to: minecraft },
    ]);
    expect(cssSymbolUsages(graph, "utility", "bg-mc-button-surface")).toEqual([
      expect.objectContaining({ file: constants, line: 1, source: "module" }),
    ]);
    expect(graph.definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "keyframes", name: "sparkle", file: minecraft }),
        expect.objectContaining({ kind: "utility", name: "animate-sparkle", file: minecraft }),
      ]),
    );
  });

  it("does not mistake prefix substrings for complete utility names", () => {
    const scoped = buildCssDependencyGraph({
      sourceRoot: root,
      css: [{ path: globals, content: "@utility panel { @apply bg-red-500; }" }],
      modules: [{ path: component, content: 'const cls = "panel-wide";' }],
    });
    expect(cssSymbolUsages(scoped, "utility", "panel")).toEqual([]);
  });

  it("links semantic color and radius tokens to generated classes in modules and @apply", () => {
    const index = buildCssDependencyGraph({
      sourceRoot: root,
      css: [
        {
          path: tokens,
          content: [
            "@theme {",
            "  --color-primary-canvas: #ffffff;",
            "  --color-primary-ink: #18181b;",
            "  --color-primary-edge: #cccccc;",
            "  --radius-card: 0.5rem;",
            "}",
            "@utility button-frame { @apply border-primary-edge bg-primary-canvas; }",
          ].join("\n"),
        },
      ],
      modules: [
        {
          path: component,
          content: 'const cls = "hover:bg-primary-canvas/50 text-primary-ink ring-primary-edge rounded-card";',
        },
      ],
    });
    expect(cssSymbolUsages(index, "theme-class", "bg-primary-canvas")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "css", token: "--color-primary-canvas" }),
        expect.objectContaining({ source: "module", token: "--color-primary-canvas" }),
      ]),
    );
    expect(cssSymbolUsages(index, "theme-class", "text-primary-ink")).toEqual([
      expect.objectContaining({ token: "--color-primary-ink", file: component }),
    ]);
    expect(cssSymbolUsages(index, "theme-class", "ring-primary-edge")).toEqual([
      expect.objectContaining({ token: "--color-primary-edge", file: component }),
    ]);
    expect(cssSymbolUsages(index, "theme-class", "rounded-card")).toEqual([
      expect.objectContaining({ token: "--radius-card", file: component }),
    ]);
    expect(cssSymbolUsages(index, "theme-class", "bg-primary-ink")).toEqual([]);
  });

  it("normalizes equivalent font-weight descriptors while distinguishing weight and Unicode ranges", () => {
    const index = buildCssDependencyGraph({
      sourceRoot: root,
      css: [
        { path: tokens, content: '@font-face { font-family: "Atlas"; font-weight: 400; src: url(a.woff2) }' },
        { path: minecraft, content: "@font-face { font-family: Atlas; font-weight: normal; src: url(b.woff2) }" },
        { path: globals, content: "@font-face { font-family: Atlas; font-weight: bold; src: url(c.woff2) }" },
      ],
      modules: [],
    });
    const signatures = index.definitions
      .filter((symbol) => symbol.kind === "font-face")
      .map((symbol) => symbol.identity);
    expect(signatures[0]).toBe(signatures[1]);
    expect(signatures[2]).not.toBe(signatures[1]);
  });

  it("tracks plain animation declarations and skips non-generating token namespaces", () => {
    const index = buildCssDependencyGraph({
      sourceRoot: root,
      css: [
        {
          path: globals,
          content: [
            "@theme {",
            " --spacing: 0.25rem;",
            " --font--legacy: monospace;",
            "}",
            "@keyframes pulse { to { opacity: 0.5; } }",
            ".glow { animation: pulse 1s linear; }",
            ".blink { animation-name: pulse; }",
          ].join("\n"),
        },
      ],
      modules: [{ path: component, content: 'const cls = "glow blink";' }],
    });
    expect(cssSymbolUsages(index, "keyframes", "pulse")).toEqual([
      expect.objectContaining({ source: "css", file: globals }),
      expect.objectContaining({ source: "css", file: globals }),
    ]);
    expect(cssSymbolUsages(index, "theme-class", "font--legacy")).toEqual([]);
    expect(index.definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "selector", name: "glow" }),
        expect.objectContaining({ kind: "selector", name: "blink" }),
      ]),
    );
  });

  it("ignores declaration-shaped comments and marks conditional root overrides", () => {
    const index = buildCssDependencyGraph({
      sourceRoot: root,
      css: [
        {
          path: globals,
          content:
            "@theme { /*\n --color-fake: red;\n */ --color-real: blue; }\n" +
            ":root { --gap: 1rem; }\n" +
            "@media (min-width: 40rem) { @layer base { :root { --gap: 2rem; } } }",
        },
      ],
      modules: [],
    });
    expect(index.definitions.filter((symbol) => symbol.kind === "theme-token").map((symbol) => symbol.name)).toEqual([
      "--color-real",
    ]);
    expect(index.definitions.filter((symbol) => symbol.kind === "root-variable").map((symbol) => symbol.scope)).toEqual(
      ["default", "conditional"],
    );
  });
});
