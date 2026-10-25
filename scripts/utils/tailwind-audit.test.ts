import { describe, expect, it } from "vitest";
import { auditTailwindStyles } from "./tailwind-audit";

const sampleCss = [
  ":root {",
  "  --base-ink: #ffffff;",
  "  --fallback-ink: #ffffff;",
  "}",
  "@theme {",
  "  --radius-sm: 0.25rem;",
  "  --radius-sm: 0.125rem;",
  "}",
  "@utility text-balance { @apply [text-wrap:balance]; }",
  "@utility text-retro-11 { @apply [font-size:11px]; }",
  "@utility w-panel-26 { @apply [width:26rem]; }",
  "@utility max-w-panel-26 { @apply [max-width:26rem]; }",
  "@utility starfield-container { @apply [contain:layout_style_paint]; }",
  "@utility trippy-background { @apply [contain:layout_style_paint]; }",
  "@utility animate-wobble { @apply [animation:wobble_4s_ease-in-out_infinite]; }",
  "@media (prefers-reduced-motion: reduce) {",
  "  .animate-wobble { animation: none !important; }",
  "}",
].join("\n");

describe("read-only Tailwind audit", () => {
  it("finds redundant mappings and duplicate declarations without enforcing changes", () => {
    const source =
      '<div className="text-balance text-retro-11 w-panel-26 max-w-panel-26 starfield-container trippy-background" />';
    const report = auditTailwindStyles(sampleCss, [source]);
    expect(report.summary.utilities).toBe(7);
    expect(report.findings.find((finding) => finding.kind === "built-in-duplicate")?.names).toEqual(["text-balance"]);
    expect(report.findings.find((finding) => finding.kind === "duplicate-theme-token")?.names).toEqual(["--radius-sm"]);
    expect(report.findings.find((finding) => finding.kind === "duplicate-utility")?.names).toEqual([
      "starfield-container",
      "trippy-background",
    ]);
    const candidates = report.findings.filter((finding) => finding.kind === "theme-candidate");
    expect(candidates.map((finding) => finding.names[0])).toEqual(["text-retro-11", "w-panel-26", "max-w-panel-26"]);
  });

  it("does not count a CSS selector as evidence of component usage", () => {
    const report = auditTailwindStyles(sampleCss, []);
    expect(
      report.findings.some((finding) => finding.kind === "possible-unused" && finding.names[0] === "animate-wobble"),
    ).toBe(true);
  });

  it("treats shared root values as informational semantic roles", () => {
    const report = auditTailwindStyles(sampleCss, []);
    const shared = report.findings.find((finding) => finding.kind === "shared-root-value");
    expect(shared?.names).toEqual(["--base-ink", "--fallback-ink"]);
    expect(shared?.detail).toContain("intentional");
  });

  it("reports conflicting namespace values instead of offering unsafe migrations", () => {
    const css = [
      "@utility min-h-showcase { @apply [min-height:500px]; }",
      "@utility max-h-showcase { @apply [max-height:calc(100vh_-_200px)]; }",
    ].join("\n");
    const report = auditTailwindStyles(css, ['className="min-h-showcase max-h-showcase"']);
    const conflict = report.findings.find((finding) => finding.kind === "theme-token-collision");
    expect(conflict?.names).toEqual(["min-h-showcase", "max-h-showcase"]);
    expect(report.findings.filter((finding) => finding.kind === "theme-candidate")).toEqual([]);
  });

  it("reports the actual line of a duplicated theme declaration", () => {
    const report = auditTailwindStyles(sampleCss, []);
    const duplicate = report.findings.find((finding) => finding.kind === "duplicate-theme-token");
    expect(duplicate?.line).toBe(7);
  });

  it("does not suggest a namespace for compound styling operations", () => {
    const css = "@utility retro-card { @apply [font-size:11px] [color:red]; }";
    const report = auditTailwindStyles(css, ['className="retro-card"']);
    expect(report.findings.filter((finding) => finding.kind === "theme-candidate")).toEqual([]);
  });
});
