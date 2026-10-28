import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCssDependencyGraph } from "./css-dependency-graph";
import type { CssDependencyGraph } from "./css-dependency-graph";
import { planCssSplit, projectCssSplit } from "./css-split-plan";
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

  it("creates lossless, ordered virtual fragments without touching the CSS", () => {
    const source = css.replace("@utility mc-button", "/* keep this comment with the next slice */\n@utility mc-button");
    const { plan } = analyze(source);
    const projection = projectCssSplit(source, plan);
    expect(projection.entry).toContain('@import "tailwindcss";');
    expect(projection.entry).toContain('@import "./pasika-split-000.css";');
    expect(projection.fragments.map((fragment) => fragment.content).join("")).toBe(
      source.slice(plan.order.entryPrefixEndOffset),
    );
    expect(projection.fragments.some((fragment) => fragment.content.includes("keep this comment"))).toBe(true);
    expect(plan.order.segments.flatMap((segment) => segment.blockIds)).toEqual(plan.blocks.map((block) => block.id));
  });

  it("flags interleaving, cross-segment links and repeated selectors instead of calling them safe", () => {
    const source = [
      '@import "tailwindcss";',
      "@theme { --color-brand-ink: #fff; }",
      "@utility mc-button { @apply text-brand-ink; }",
      "body { color: red; }",
      "@utility animate-sparkle { @apply text-brand-ink; }",
      "body { color: blue; }",
    ].join("\n");
    const { plan } = analyze(source);
    expect(plan.order.constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "interleaved-owner" }),
        expect.objectContaining({ kind: "cross-segment-dependency" }),
        expect.objectContaining({ kind: "repeated-selector" }),
      ]),
    );
    expect(
      plan.order.constraints.some(
        (constraint) => constraint.kind === "repeated-selector" && constraint.detail.includes("body"),
      ),
    ).toBe(true);
  });

  it("rejects a virtual projection when an import occurs after a CSS block", () => {
    const source = '@utility mc-button { display: block; }\n@import "./late.css";';
    const { plan } = analyze(source);
    expect(plan.order.constraints).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "late-import" })]));
    expect(() => projectCssSplit(source, plan)).toThrow("after non-import");
  });

  it("proves that overlapping feature ownership spans cannot each form one ordered file", () => {
    const source = [
      "@utility alpha-first { display: block; }",
      "@utility beta-first { display: inline; }",
      "@utility alpha-last { display: flex; }",
      "@utility beta-last { display: grid; }",
    ].join("\n");
    const graph = buildCssDependencyGraph({
      sourceRoot: root,
      css: [{ path: cssPath, content: source }],
      modules: [
        { path: path.join(root, "features/alpha/button.tsx"), content: '"alpha-first alpha-last"' },
        { path: path.join(root, "features/beta/button.tsx"), content: '"beta-first beta-last"' },
      ],
    });
    const plan = planCssSplit({ cssPath, content: source, sourceRoot: root, graph });
    expect(plan.blocks.map((block) => block.ownership)).toEqual([
      "features/alpha",
      "features/beta",
      "features/alpha",
      "features/beta",
    ]);
    expect(plan.order.ownerStableWindows).toEqual([
      expect.objectContaining({
        blockIds: [0, 1, 2, 3],
        owners: ["features/alpha", "features/beta"],
        unresolvedBlocks: 0,
      }),
    ]);
  });

  it("keeps unrelated unresolved blocks separate from true owner-stability constraints", () => {
    const source = [
      "@utility alpha-first { display: block; }",
      "@utility alpha-last { display: flex; }",
      '@font-face { font-family: "Unlinked"; src: url(font.woff2); }',
      "@keyframes unrelated { to { opacity: 1; } }",
    ].join("\n");
    const graph = buildCssDependencyGraph({
      sourceRoot: root,
      css: [{ path: cssPath, content: source }],
      modules: [{ path: path.join(root, "features/alpha/button.tsx"), content: '"alpha-first alpha-last"' }],
    });
    const plan = planCssSplit({ cssPath, content: source, sourceRoot: root, graph });
    expect(plan.order.ownerStableWindows.map((window) => window.blockIds)).toEqual([[0, 1], [2], [3]]);
    expect(plan.order.ownerStableWindows[1]?.unresolvedBlocks).toBe(1);
    expect(plan.order.ownerStableWindows.flatMap((window) => window.blockIds)).toEqual(
      plan.blocks.map((block) => block.id),
    );
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
