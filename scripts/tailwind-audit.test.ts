import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runTailwindAudit } from "./tailwind-audit";

const root = mkdtempSync(path.join(tmpdir(), "pasika-tailwind-cli-"));
const cssPath = path.join(root, "src", "app", "styles", "globals.css");
const css = [
  ":root { --base-ink: #ffffff; }",
  "@theme { --text-retro-11: 11px; }",
  "@utility text-balance { @apply [text-wrap:balance]; }",
  "@utility animate-wobble { @apply [animation:wobble_4s_ease-in-out_infinite]; }",
].join("\n");

beforeAll(() => {
  mkdirSync(path.dirname(cssPath), { recursive: true });
  mkdirSync(path.join(root, "src", "ui", "nested"), { recursive: true });
  mkdirSync(path.join(root, "src", ".git"), { recursive: true });
  writeFileSync(cssPath, css);
  writeFileSync(path.join(root, "src", "ui", "nested", "panel.tsx"), '<p className="text-balance">hello</p>');
  writeFileSync(path.join(root, "src", ".git", "ignored.ts"), 'const ignored = "animate-wobble";');
  writeFileSync(path.join(root, "src", "ui", "asset.png"), "binary-placeholder");
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function output(args: string[]): string {
  const messages: string[] = [];
  runTailwindAudit(args, (message) => messages.push(message));
  return messages.join("");
}

describe("read-only Tailwind audit CLI", () => {
  it("shows help without requiring a repository", () => {
    expect(output(["--help"])).toContain("Usage:");
  });

  it("prints diagnostics without modifying project files", () => {
    const before = readFileSync(cssPath, "utf8");
    const result = output([root]);
    expect(result).toContain("built-in-duplicate");
    expect(result).toContain("possible-unused");
    expect(result).toContain("No files modified");
    expect(readFileSync(cssPath, "utf8")).toBe(before);
    expect(existsSync(path.join(root, ".pasika-audit"))).toBe(false);
  });

  it("emits valid JSON with the same findings and target", () => {
    const result: unknown = JSON.parse(output([root, "--json"]));
    expect(result).toMatchObject({
      target: path.resolve(root),
      summary: { utilities: 2, possibleUnusedUtilities: 1 },
    });
  });

  it("rejects missing and unsupported command-line arguments", () => {
    expect(() => output([])).toThrow("Usage:");
    expect(() => output(["--unknown", root])).toThrow("Usage:");
  });

  it("reports a missing repository", () => {
    expect(() => output([path.join(root, "missing")])).toThrow("does not exist");
  });

  it("reports a directory without the expected stylesheet", () => {
    expect(() => output([path.join(root, "src", "ui")])).toThrow("Missing src/app/styles/globals.css");
  });

  it("supports a project without source components", () => {
    const bare = mkdtempSync(path.join(tmpdir(), "pasika-tailwind-cli-bare-"));
    try {
      mkdirSync(path.join(bare, "src", "app", "styles"), { recursive: true });
      writeFileSync(
        path.join(bare, "src", "app", "styles", "globals.css"),
        "@utility unused { @apply cursor-pointer; }",
      );
      expect(output([bare, "--json"])).toContain("possible-unused");
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});
