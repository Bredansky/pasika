import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildCssDependencyGraph } from "../eslint/rules/tailwind/css-dependency-graph";
import { planCssSplit } from "../eslint/rules/tailwind/css-split-plan";
import type { CssSplitPlan } from "../eslint/rules/tailwind/css-split-plan";
import { verifyCssSplit } from "./css-split-verify";

let root: string | undefined;

function fixture(options: { outputMismatch?: boolean; sourceMismatch?: boolean; installCompiler?: boolean } = {}): {
  root: string;
  sourceRoot: string;
  cssPath: string;
  content: string;
  plan: CssSplitPlan;
} {
  root = mkdtempSync(path.join(os.tmpdir(), "pasika-css-verifier-test-"));
  const sourceRoot = path.join(root, "src");
  const cssPath = path.join(sourceRoot, "app", "styles", "globals.css");
  mkdirSync(path.dirname(cssPath), { recursive: true });
  const content = '@import "tailwindcss";\r\n/* retain a comment */\r\n@utility demo { display: block; }\r\n';
  writeFileSync(cssPath, content);
  writeFileSync(path.join(root, "package.json"), '{"type":"module"}');
  if (options.installCompiler !== false) {
    const node = path.join(root, "node_modules", "@tailwindcss", "node");
    const oxide = path.join(root, "node_modules", "@tailwindcss", "oxide");
    mkdirSync(node, { recursive: true });
    mkdirSync(oxide, { recursive: true });
    for (const folder of [node, oxide]) {
      writeFileSync(path.join(folder, "package.json"), '{"type":"module","main":"index.mjs"}');
    }
    const compiler = [
      'import { readFileSync } from "node:fs";',
      "export async function compile(initial, options) {",
      "  let css = initial;",
      '  const virtual = typeof options.customCssResolver === "function";',
      '  for (const match of [...initial.matchAll(/@import "(\\.\\/pasika-split-\\d+\\.css)";\\n/g)]) {',
      "    const file = await options.customCssResolver(match[1], options.base);",
      '    css = css.replace(match[0], readFileSync(file, "utf8"));',
      "  }",
      `  if (virtual && ${String(options.outputMismatch === true)}) css += "changed";`,
      `  const sources = virtual && ${String(options.sourceMismatch === true)} ? [{base: options.base, pattern: "*", negated: false}] : [];`,
      "  return { build: (candidates) => css + candidates.join('|'), sources };",
      "}",
    ].join("\n");
    writeFileSync(path.join(node, "index.mjs"), compiler);
    writeFileSync(
      path.join(oxide, "index.mjs"),
      'export class Scanner { scan() { return ["demo", "bg-red-500"]; } }\n',
    );
  }
  const graph = buildCssDependencyGraph({ css: [{ path: cssPath, content }], modules: [], sourceRoot });
  return {
    root,
    sourceRoot,
    cssPath,
    content,
    plan: planCssSplit({ cssPath, content, sourceRoot, graph }),
  };
}

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  root = undefined;
});

describe("Virtual Tailwind split verification", () => {
  it("compares byte-for-byte compiler output on identical candidate sets", async () => {
    const result = await verifyCssSplit(fixture());
    expect(result).toEqual({
      matched: true,
      candidates: 2,
      originalBytes: result.projectedBytes,
      projectedBytes: result.originalBytes,
      firstDifference: null,
      sourcesMatched: true,
    });
  });

  it("reports the offset and fails parity when generated CSS changes", async () => {
    const result = await verifyCssSplit(fixture({ outputMismatch: true }));
    expect(result.matched).toBe(false);
    expect(result.firstDifference).toBeGreaterThan(0);
    expect(result.projectedBytes).toBeGreaterThan(result.originalBytes);
  });

  it("rejects changed Tailwind source directives even when CSS bytes match", async () => {
    const result = await verifyCssSplit(fixture({ sourceMismatch: true }));
    expect(result.matched).toBe(false);
    expect(result.firstDifference).toBeNull();
    expect(result.sourcesMatched).toBe(false);
  });

  it("does not silently pass without installed project compiler dependencies", async () => {
    await expect(verifyCssSplit(fixture({ installCompiler: false }))).rejects.toThrow();
  });
});
