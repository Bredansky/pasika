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
