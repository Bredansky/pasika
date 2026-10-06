import assert from "node:assert/strict";
import type { Linter } from "eslint";
import { describe, it } from "vitest";
import { pasikaNextjsApp, pasikaApp } from "./index";

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
  it("pasikaNextjsApp contains every pasikaApp block (pasikaApp is a subset)", () => {
    assert.ok(pasikaNextjsApp.length > pasikaApp.length);
    for (const repoBlock of pasikaApp) {
      assert.ok(pasikaNextjsApp.includes(repoBlock), "pasikaNextjsApp should reuse the pasikaApp block by reference");
    }
  });

  it("pasikaApp carries no src/** source block: manifest, zirka contract, and docs only", () => {
    assert.ok(
      !fileGlobs(pasikaApp).some((glob) => glob.includes("src/")),
      "pasikaApp must not lint src/** — source linting belongs to pasikaNextjsApp",
    );
    assert.ok(
      fileGlobs(pasikaApp).some((glob) => glob === "package.json"),
      "pasikaApp must enforce the manifest rules",
    );
    assert.ok(
      fileGlobs(pasikaApp).some((glob) => glob.startsWith("eslint.config.")),
      "pasikaApp must enforce the zirka contract",
    );
    assert.ok(
      fileGlobs(pasikaApp).some((glob) => glob.startsWith("docs/")),
      "pasikaApp must lint the docs",
    );
  });

  it("pasikaNextjsApp runs every source rule on src/**", () => {
    const ruleRefs = (blocks: Linter.Config[]): Set<string> =>
      new Set(blocks.flatMap((block) => Object.keys(block.rules ?? {})));
    const next = ruleRefs(pasikaNextjsApp);
    assert.ok(next.has("pasika/filename-case"), "pasikaNextjsApp must keep the TypeScript app rules");
    assert.ok(next.has("pasika/cn-helper"), "pasikaNextjsApp must add the Next.js app rules");
    assert.ok(
      fileGlobs(pasikaNextjsApp).some((file) => file === "src/app/styles/globals.css"),
      "missing the Tailwind globals block",
    );
    assert.ok(
      fileGlobs(pasikaNextjsApp).some((glob) => glob.includes("src/**/*.{")),
      "pasikaNextjsApp must lint src/** with a source block",
    );
  });

  it("the Next.js-stack requirement applies only to pasikaNextjsApp, not pasikaApp", () => {
    const ruleRefs = (blocks: Linter.Config[]): Set<string> =>
      new Set(blocks.flatMap((block) => Object.keys(block.rules ?? {})));
    assert.ok(ruleRefs(pasikaNextjsApp).has("pasika/nextjs-stack"), "pasikaNextjsApp must enforce nextjs-stack");
    assert.ok(
      !ruleRefs(pasikaApp).has("pasika/nextjs-stack"),
      "pasikaApp must not force the Next.js stack on plain repos",
    );
  });

  it("the src/** blocks ship a TypeScript/JSX parser and enable project services only for TypeScript", () => {
    const srcBlocks = (preset: Linter.Config[]): Linter.Config[] =>
      preset.filter((block) => (block.files ?? []).some((glob) => glob.includes("src/**/*.{")));
    const blocks = srcBlocks(pasikaNextjsApp);
    assert.ok(blocks.length >= 2, "pasikaNextjsApp must contain source and typed-project src/** blocks");

    const sourceBlock = blocks.find((block) =>
      (block.files ?? []).includes("src/**/*.{cjs,cts,js,jsx,mjs,mts,ts,tsx}"),
    );
    assert.ok(sourceBlock, "missing the broad src/** source block");
    assert.equal(typeof sourceBlock.languageOptions?.parser, "object", "source block must ship the TS/JSX parser");
    const sourceParserOptions = sourceBlock.languageOptions?.parserOptions;
    const sourceProjectService =
      typeof sourceParserOptions === "object" && sourceParserOptions !== null && "projectService" in sourceParserOptions
        ? sourceParserOptions.projectService
        : undefined;
    assert.equal(
      sourceProjectService,
      undefined,
      "the broad source block must not force JS files into the TypeScript project",
    );

    const typedBlock = blocks.find((block) => (block.files ?? []).includes("src/**/*.{cts,mts,ts,tsx}"));
    assert.ok(typedBlock, "missing the typed-project src/** block");
    assert.equal(typeof typedBlock.languageOptions?.parser, "object", "typed block must ship the parser");
    const typedParserOptions = typedBlock.languageOptions?.parserOptions;
    const typedProjectService =
      typeof typedParserOptions === "object" && typedParserOptions !== null && "projectService" in typedParserOptions
        ? typedParserOptions.projectService
        : undefined;
    assert.equal(
      typedProjectService,
      true,
      "typed source must enable TypeScript project services for ownership-aware rules",
    );

    assert.equal(srcBlocks(pasikaApp).length, 0, "pasikaApp carries no src/** block");
  });

  it("both presets enforce the zirka configuration contract on root config files", () => {
    const ruleRefs = (blocks: Linter.Config[]): Set<string> =>
      new Set(blocks.flatMap((block) => Object.keys(block.rules ?? {})));
    for (const preset of [pasikaApp, pasikaNextjsApp]) {
      assert.ok(ruleRefs(preset).has("pasika/zirka-baseline"), "preset must enforce zirka-baseline");
    }
    assert.ok(
      fileGlobs(pasikaApp).some((glob) => glob.startsWith("eslint.config.")),
      "zirka-baseline must run on the root eslint config file",
    );
  });

  it("no plugin name is redefined with a different object across a preset's blocks", () => {
    for (const preset of [pasikaApp, pasikaNextjsApp]) {
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

  it("both presets enforce the vulyk docs contract on the manifest", () => {
    const ruleRefs = (blocks: Linter.Config[]): Set<string> =>
      new Set(blocks.flatMap((block) => Object.keys(block.rules ?? {})));
    for (const preset of [pasikaApp, pasikaNextjsApp]) {
      assert.ok(ruleRefs(preset).has("pasika/tracked-docs"), "preset must enforce tracked-docs");
    }
  });
});
