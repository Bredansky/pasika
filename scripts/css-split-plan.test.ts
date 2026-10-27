import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const savedArgs = process.argv;
let targetRoot: string | undefined;

function makeTarget(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "pasika-css-plan-"));
  targetRoot = root;
  const styles = path.join(root, "src/app/styles");
  const feature = path.join(root, "src/features/home");
  mkdirSync(styles, { recursive: true });
  mkdirSync(feature, { recursive: true });
  writeFileSync(
    path.join(styles, "globals.css"),
    '@import "tailwindcss";\n@theme { --color-brand-ink: #fff; }\n@utility home-decoration { @apply text-brand-ink; }\n',
  );
  writeFileSync(path.join(feature, "banner.tsx"), 'export const classes = "home-decoration text-brand-ink";\n');
  return root;
}

async function runCli(root: string, ...flags: string[]): Promise<string> {
  vi.resetModules();
  process.argv = ["node", "css-split-plan.ts", root, ...flags];
  const captured: string[] = [];
  const writer = vi.spyOn(process.stdout, "write").mockImplementation((value) => {
    captured.push(String(value));
    return true;
  });
  try {
    await import("./css-split-plan");
  } finally {
    writer.mockRestore();
  }
  return captured.join("");
}

afterEach(() => {
  process.argv = savedArgs;
  vi.restoreAllMocks();
  if (targetRoot) rmSync(targetRoot, { recursive: true, force: true });
  targetRoot = undefined;
});

describe("CSS split inventory CLI", () => {
  it("prints responsibility cohorts and lexical tokens without modifying the target", async () => {
    const root = makeTarget();
    const stylesheet = path.join(root, "src/app/styles/globals.css");
    const before = readFileSync(stylesheet, "utf8");
    const report = await runCli(root);
    expect(report).toContain("Top-level blocks: 2");
    expect(report).toContain("features/home");
    expect(report).toContain("--color-brand-ink");
    expect(readFileSync(stylesheet, "utf8")).toBe(before);
  });

  it("supports a structured JSON inventory", async () => {
    const root = makeTarget();
    const report = z
      .object({ blocks: z.array(z.unknown()), cohorts: z.array(z.unknown()) })
      .parse(JSON.parse(await runCli(root, "--json")));
    expect(report.blocks).toHaveLength(2);
    expect(report.cohorts.length).toBeGreaterThan(0);
  });

  it("reads the committed monolith even if the working file has changed", async () => {
    const root = makeTarget();
    execFileSync("git", ["init", "-q"], { cwd: root });
    execFileSync("git", ["add", "src/app/styles/globals.css"], { cwd: root });
    execFileSync(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "-qm", "CSS fixture"],
      { cwd: root },
    );
    writeFileSync(path.join(root, "src/app/styles/globals.css"), '@import "tailwindcss";\n');
    expect(await runCli(root, "--head")).toContain("Top-level blocks: 2");
    expect(await runCli(root)).toContain("Top-level blocks: 0");
  });
});
