import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildCssDependencyGraph } from "../eslint/rules/tailwind/css-dependency-graph";
import { planCssSplit } from "../eslint/rules/tailwind/css-split-plan";
import type { CssSplitPlan } from "../eslint/rules/tailwind/css-split-plan";
import { verifyNextCssSplit } from "./css-split-next-verify";

let source: string | undefined;
const css = '@import "tailwindcss";\n/* preserve a blank line */\n@utility demo { display: block; }\n';

function makeGitFixture(): { root: string; cssPath: string; content: string; plan: CssSplitPlan } {
  source = mkdtempSync(path.join(os.tmpdir(), "pasika-next-parity-test-"));
  const cssPath = path.join(source, "src", "app", "styles", "globals.css");
  mkdirSync(path.dirname(cssPath), { recursive: true });
  mkdirSync(path.join(source, "node_modules"), { recursive: true });
  writeFileSync(cssPath, css);
  execFileSync("git", ["init", "-q"], { cwd: source });
  execFileSync("git", ["add", "."], { cwd: source });
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "fixture"], {
    cwd: source,
  });
  const graph = buildCssDependencyGraph({
    sourceRoot: path.join(source, "src"),
    css: [{ path: cssPath, content: css }],
    modules: [],
  });
  return {
    root: source,
    cssPath,
    content: css,
    plan: planCssSplit({ cssPath, sourceRoot: path.join(source, "src"), content: css, graph }),
  };
}

function fakeNextBuild(breakParity = false): (project: string) => void {
  let count = 0;
  return (project): void => {
    count++;
    const styles = path.join(project, "src", "app", "styles");
    const input = readFileSync(path.join(styles, "globals.css"), "utf8");
    const expanded = input.replace(
      /@import "(?<relative>\.\/pasika-split-\d+\.css)";\n/gu,
      (_source, _relative: string, _offset: number, _input: string, groups: { relative: string }) =>
        readFileSync(path.join(styles, groups.relative), "utf8"),
    );
    const buildDir = path.join(project, ".next", "static", "chunks");
    mkdirSync(buildDir, { recursive: true });
    writeFileSync(path.join(buildDir, "bundle.css"), expanded + (breakParity && count === 2 ? "changed" : ""));
  };
}

function installFakeNextCli(fail = false): void {
  if (!source) throw new Error("Fixture was not initialized.");
  const directory = path.join(source, "node_modules", "next", "dist", "bin");
  mkdirSync(directory, { recursive: true });
  const script = fail
    ? 'process.stderr.write("mock Next compilation failure"); process.exit(2);'
    : [
        'const fs = require("node:fs");',
        'const path = require("node:path");',
        'if (!process.argv.includes("--webpack")) process.exit(3);',
        'const styles = path.join(process.cwd(), "src", "app", "styles");',
        'const css = fs.readFileSync(path.join(styles, "globals.css"), "utf8");',
        'const output = css.replace(/@import "(\\.\\/pasika-split-\\d+\\.css)";\\n/g, (_all, ref) => fs.readFileSync(path.join(styles, ref), "utf8"));',
        'const target = path.join(process.cwd(), ".next", "static", "chunks");',
        "fs.mkdirSync(target, { recursive: true });",
        'fs.writeFileSync(path.join(target, "output.css"), output);',
      ].join("\n");
  writeFileSync(path.join(directory, "next"), script);
}

afterEach(() => {
  if (source) rmSync(source, { recursive: true, force: true });
  source = undefined;
});

describe("Isolated Next.js CSS build verification", () => {
  it("compares actual staged files without changing the source repository", async () => {
    const options = makeGitFixture();
    const result = await verifyNextCssSplit({ ...options, build: fakeNextBuild() });
    expect(result.matched).toBe(true);
    expect(result.originalAssets).toBe(1);
    expect(result.projectedAssets).toBe(1);
    expect(result.originalBytes).toBe(result.projectedBytes);
    expect(readFileSync(options.cssPath, "utf8")).toBe(css);
  });

  it("finds emitted CSS differences even if the generated asset names are unchanged", async () => {
    const options = makeGitFixture();
    const result = await verifyNextCssSplit({ ...options, build: fakeNextBuild(true) });
    expect(result.matched).toBe(false);
    expect(result.onlyOriginal).toHaveLength(1);
    expect(result.onlyProjected).toHaveLength(1);
  });

  it("refuses to compare a dirty stylesheet against an unrelated committed clone", async () => {
    const options = makeGitFixture();
    await expect(
      verifyNextCssSplit({
        ...options,
        content: css.replace("display: block", "display: table"),
        build: fakeNextBuild(),
      }),
    ).rejects.toThrow("Committed CSS differs");
    expect(readFileSync(options.cssPath, "utf8")).toBe(css);
  });

  it("executes a production-mode Next CLI in the isolated clone", async () => {
    const options = makeGitFixture();
    installFakeNextCli();
    const result = await verifyNextCssSplit(options);
    expect(result.matched).toBe(true);
    expect(result.bundler).toBe("webpack");
    expect(readFileSync(options.cssPath, "utf8")).toBe(css);
  });

  it("does not confuse a failed Next build with a CSS mismatch", async () => {
    const options = makeGitFixture();
    installFakeNextCli(true);
    await expect(verifyNextCssSplit(options)).rejects.toThrow("mock Next compilation failure");
  });

  it("refuses to build without installed dependencies", async () => {
    const options = makeGitFixture();
    rmSync(path.join(options.root, "node_modules"), { recursive: true });
    await expect(verifyNextCssSplit({ ...options, build: fakeNextBuild() })).rejects.toThrow(
      "node_modules is required",
    );
  });

  it("fails instead of claiming parity when the build emits no CSS", async () => {
    const options = makeGitFixture();
    await expect(verifyNextCssSplit({ ...options, build: () => undefined })).rejects.toThrow("no static CSS assets");
  });
});
