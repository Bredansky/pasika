import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Linter } from "eslint";
import { nextjsApp, typescriptApp } from "./index";

function fileGlobs(blocks: Linter.Config[]): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    const files = block.files;
    if (!files) continue;
    for (const glob of files) {
      if (Array.isArray(glob)) out.push(...glob);
      else out.push(glob);
    }
  }
  return out;
}

void describe("pasika presets", () => {
  void it("nextjsApp contains every typescriptApp block (typescriptApp is a subset)", () => {
    assert.ok(nextjsApp.length > typescriptApp.length);
    for (const repoBlock of typescriptApp) {
      assert.ok(nextjsApp.includes(repoBlock), "nextjsApp should reuse the typescriptApp block by reference");
    }
  });

  void it("typescriptApp applies the TypeScript app rules to src/**, but not the Next.js ones", () => {
    const ruleRefs = (blocks: Linter.Config[]): Set<string> =>
      new Set(blocks.flatMap((block) => Object.keys(block.rules ?? {})));
    const repo = ruleRefs(typescriptApp);
    assert.ok(repo.has("pasika/filename-case"), "typescriptApp must enforce the TypeScript app rules");
    assert.ok(!repo.has("pasika/cn-helper"), "typescriptApp must not enforce Next.js app rules");
    assert.ok(
      fileGlobs(typescriptApp).some((glob) => glob.includes("src/**/*.{")),
      "typescriptApp must lint src/** with the TypeScript app block",
    );
  });

  void it("nextjsApp includes the Next.js app and stylesheet blocks on top", () => {
    const ruleRefs = (blocks: Linter.Config[]): Set<string> =>
      new Set(blocks.flatMap((block) => Object.keys(block.rules ?? {})));
    const next = ruleRefs(nextjsApp);
    assert.ok(next.has("pasika/filename-case"), "nextjsApp must keep the TypeScript app rules");
    assert.ok(next.has("pasika/cn-helper"), "nextjsApp must add the Next.js app rules");
    assert.ok(
      fileGlobs(nextjsApp).some((file) => file.includes("globals.css")),
      "missing the Tailwind globals block",
    );
  });

  void it("the Next.js-stack requirement applies only to nextjsApp, not typescriptApp", () => {
    const ruleRefs = (blocks: Linter.Config[]): Set<string> =>
      new Set(blocks.flatMap((block) => Object.keys(block.rules ?? {})));
    assert.ok(ruleRefs(nextjsApp).has("pasika/nextjs-stack"), "nextjsApp must enforce nextjs-stack");
    assert.ok(
      !ruleRefs(typescriptApp).has("pasika/nextjs-stack"),
      "typescriptApp must not force the Next.js stack on plain repos",
    );
  });

  void it("both presets enforce the zirka configuration contract on root config files", () => {
    const ruleRefs = (blocks: Linter.Config[]): Set<string> =>
      new Set(blocks.flatMap((block) => Object.keys(block.rules ?? {})));
    for (const preset of [typescriptApp, nextjsApp]) {
      assert.ok(ruleRefs(preset).has("pasika/zirka-baseline"), "preset must enforce zirka-baseline");
    }
    assert.ok(
      fileGlobs(typescriptApp).some((glob) => glob.startsWith("eslint.config.")),
      "zirka-baseline must run on the root eslint config file",
    );
  });

  void it("no plugin name is redefined with a different object across a preset's blocks", () => {
    for (const preset of [typescriptApp, nextjsApp]) {
      const seen = new Map<string, unknown>();
      for (const block of preset) {
        for (const [name, plugin] of Object.entries(block.plugins ?? {})) {
          const existing = seen.get(name);
          if (existing === undefined) {
            seen.set(name, plugin);
          } else {
            assert.equal(plugin, existing, `plugin ${name} must be the same object across the preset's blocks`);
          }
        }
      }
    }
  });

  void it("both presets enforce the vulyk docs contract on the manifest", () => {
    const ruleRefs = (blocks: Linter.Config[]): Set<string> =>
      new Set(blocks.flatMap((block) => Object.keys(block.rules ?? {})));
    for (const preset of [typescriptApp, nextjsApp]) {
      assert.ok(ruleRefs(preset).has("pasika/vulyk-docs"), "preset must enforce vulyk-docs");
    }
  });
});
