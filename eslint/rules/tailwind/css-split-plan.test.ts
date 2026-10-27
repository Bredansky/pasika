import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCssDependencyGraph } from "./css-dependency-graph";
import type { CssDependencyGraph } from "./css-dependency-graph";
import { planCssSplit } from "./css-split-plan";
import type { CssSplitPlan } from "./css-split-plan";

const root = path.resolve("fixtures/css-split/src");
const cssPath = path.join(root, "app/styles/globals.css");
const minecraft = path.join(root, "components/minecraft/button.tsx");

function analyze(
  css: string,
  moduleText = 'const cls = "animate-sparkle mc-button text-brand-ink";',
): { graph: CssDependencyGraph; plan: CssSplitPlan } {
  const graph = buildCssDependencyGraph({
    sourceRoot: root,
    css: [{ path: cssPath, content: css }],
    modules: [{ path: minecraft, content: moduleText }],
  });
  return { graph, plan: planCssSplit({ cssPath, content: css, sourceRoot: root, graph }) };
}

describe("Read-only CSS split planning", () => {
  const css = [
    '@import "tailwindcss";',
    ":root { --base-canvas: #000; }",
    "@theme { --color-brand-ink: #fff; }",
    "@keyframes sparkle { from { opacity: 0; } to { opacity: 1; } }",
    "@utility animate-sparkle { @apply [animation:sparkle_2s_ease-in-out]; }",
    "@utility mc-button { @apply [background:#222]; }",
    "@layer base { body { @apply text-brand-ink; } }",
  ].join("\n");

  it("connects arbitrary @apply animations to their keyframes and feature consumer", () => {
    const { graph, plan } = analyze(css);
    expect(graph.references).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "keyframes", name: "sparkle", source: "css" })]),
    );
    expect(plan.blocks.map((block) => block.ownership)).toEqual([
      "shared-foundation",
      "shared-foundation",
      "components/minecraft",
      "components/minecraft",
      "components/minecraft",
      "global-base",
    ]);
    expect(plan.blocks[3]?.dependencies).toContain(2);
    expect(plan.cohorts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ownership: "components/minecraft", blockIds: [2, 3, 4], contiguousRuns: 1 }),
      ]),
    );
    expect(plan.runs).toEqual(
      expect.arrayContaining([expect.objectContaining({ ownership: "components/minecraft", blockIds: [2, 3, 4] })]),
    );
  });

  it("reports lexical usage counts outside the CSS source rather than inserting unstable comments", () => {
    const { plan } = analyze(css);
    expect(plan.tokens.find((token) => token.name === "--color-brand-ink")).toEqual({
      name: "--color-brand-ink",
      cssSites: 1,
      moduleSites: 1,
      files: 2,
    });
  });

  it("does not collapse distant feature groups or force unknown blocks into a file", () => {
    const withGap = css.replace(
      "@utility mc-button",
      '@font-face { font-family: "Unlinked"; src: url(font.woff2); }\n@utility mc-button',
    );
    const { plan } = analyze(withGap);
    expect(plan.unresolvedBlocks).toBe(1);
    expect(
      plan.runs.filter((run) => run.ownership === "components/minecraft").map((run) => run.blockIds.length),
    ).toEqual([2, 1]);
  });

  it("does not mistake unrelated modules for a feature ownership signal", () => {
    const other = path.join(root, "app/home/page.tsx");
    const graph = buildCssDependencyGraph({
      sourceRoot: root,
      css: [{ path: cssPath, content: "@utility shared { @apply [opacity:0.5]; }" }],
      modules: [
        { path: minecraft, content: '"shared"' },
        { path: other, content: '"shared"' },
      ],
    });
    const plan = planCssSplit({
      cssPath,
      content: "@utility shared { @apply [opacity:0.5]; }",
      sourceRoot: root,
      graph,
    });
    expect(plan.blocks[0]?.ownership).toBe("unresolved");
    expect(plan.runs).toEqual([]);
  });
});
