import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Linter } from "eslint";
import { pasikaNext, pasikaRepo } from "./index";

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
  void it("pasikaNext contains every pasikaRepo block (pasikaRepo is a subset)", () => {
    assert.ok(pasikaNext.length > pasikaRepo.length);
    for (const repoBlock of pasikaRepo) {
      assert.ok(pasikaNext.includes(repoBlock), "pasikaNext should reuse the pasikaRepo block by reference");
    }
  });

  void it("pasikaRepo blocks never touch src/**", () => {
    const srcPattern = /\bsrc(?:\/|\*\*)/;
    const globs = fileGlobs(pasikaRepo);
    assert.ok(globs.length >= pasikaRepo.length, "every pasikaRepo block scopes to a files glob");
    for (const glob of globs) {
      assert.ok(!srcPattern.test(glob), `pasikaRepo block must not lint src (got ${glob})`);
    }
  });

  void it("pasikaNext includes the src/** source and stylesheet blocks", () => {
    const globs = fileGlobs(pasikaNext);
    assert.ok(
      globs.some((file) => file.includes("globals.css")),
      "missing the Tailwind globals block",
    );
    assert.ok(
      globs.some((file) => file.includes("src/**/*.{")),
      "missing the TS/TSX src block",
    );
  });
});
