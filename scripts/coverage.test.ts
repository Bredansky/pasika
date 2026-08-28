import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { classifyRequirement } from "../utils/classify";
import { readRegistry, writeRegistry } from "../utils/registry";
import { parseDocs } from "../utils/parse-docs";
import type { Registry, Requirement } from "../utils/types";

const DOC = `# Example Rule

A document needs an overview.

- A module MUST use named exports.
- A module MAY re-export a sibling.

## Incorrect — Default Export

\`\`\`ts
export default function sum() {}
\`\`\`

Why: helper files use named exports only.

## Correct — Named Export

\`\`\`ts
export function sum() {}
\`\`\`

Why: the export is named.
`;

const docsRoot = mkdtempSync(path.join(tmpdir(), "pasika-coverage-"));
mkdirSync(path.join(docsRoot, "rules"), { recursive: true });
writeFileSync(path.join(docsRoot, "rules", "example-rule.md"), DOC);

const requirements = parseDocs(docsRoot).flatMap((doc) => doc.requirements);
const [mustRequirement, mayRequirement] = requirements;
if (!mustRequirement || !mayRequirement) throw new Error("fixture did not parse two requirements");

const emptyRegistry: Registry = { requirements: [] };

const classify = (input: Parameters<typeof classifyRequirement>[0]["input"]): ReturnType<typeof classifyRequirement> =>
  classifyRequirement({ docsRoot, registry: emptyRegistry, input });

void describe("classifyRequirement", () => {
  void it("rejects a hash that no requirement in the documentation has", () => {
    assert.throws(() => classify({ hash: "deadbeef00", note: "why" }), /has hash "deadbeef00"/);
  });

  void it("rejects an entry without a note, because the note is the whole content", () => {
    assert.throws(() => classify({ hash: mustRequirement.hash, ref: "pasika/filename-case" }), /--note is required/);
    assert.throws(() => classify({ hash: mustRequirement.hash, note: "  " }), /--note is required/);
  });

  void it("rejects a ref that is neither a rule nor a doctor check", () => {
    assert.throws(
      () => classify({ hash: mustRequirement.hash, ref: "pasika/not-a-rule", note: "why" }),
      /is not a rule or doctor check/,
    );
  });

  void it("accepts a ref naming the rule that governs the requirement", () => {
    const { requirement } = classify({
      hash: mustRequirement.hash,
      ref: "pasika/filename-case",
      note: "reports a default export where the file exports values",
    });
    assert.equal(requirement.ref, "pasika/filename-case");
    assert.equal(requirement.note, "reports a default export where the file exports values");
    assert.equal("kind" in requirement, false, "kind is gone from the registry entry");
  });

  void it("accepts a doctor check ref", () => {
    const { requirement } = classify({
      hash: mayRequirement.hash,
      ref: "pasika/config-baseline",
      note: "pasika doctor checks the eslint config against the baseline",
    });
    assert.equal(requirement.ref, "pasika/config-baseline");
  });

  void it("accepts an entry without a ref, applied by judgment", () => {
    const { requirement } = classify({
      hash: mayRequirement.hash,
      note: "a reviewer decides whether the sibling is worth re-exporting",
    });
    assert.equal(requirement.ref, undefined);
    assert.equal(requirement.note, "a reviewer decides whether the sibling is worth re-exporting");
  });

  void it("records the requirement as the documentation currently words it", () => {
    const { registry, requirement } = classify({
      hash: mustRequirement.hash,
      ref: "pasika/filename-case",
      note: "reports a default export",
    });
    assert.equal(requirement.text, mustRequirement.text);
    assert.equal(requirement.doc, "rules/example-rule.md");
    assert.equal(requirement.ref, "pasika/filename-case");
    assert.equal(registry.requirements.length, 1);
  });

  void it("replaces rather than duplicates when the same requirement is classified again", () => {
    const first = classify({ hash: mustRequirement.hash, note: "applied by judgment" });
    const second = classifyRequirement({
      docsRoot,
      registry: first.registry,
      input: { hash: mustRequirement.hash, ref: "pasika/filename-case", note: "reports a default export" },
    });
    assert.equal(second.registry.requirements.length, 1, "reclassifying replaces rather than duplicates");
    assert.equal(second.requirement.ref, "pasika/filename-case");
  });

  void it("accepts several rule refs for one requirement", () => {
    const { requirement } = classify({
      hash: mustRequirement.hash,
      ref: "pasika/overview-length, pasika/no-template-prompt",
      note: "docs-check: two rules cover it",
    });
    assert.equal(requirement.ref, "pasika/overview-length, pasika/no-template-prompt");
  });
});

/** A registry entry for one parsed requirement. */
function toEntry(parsed: { doc: string; raw: string; hash: string }): Requirement {
  return { doc: parsed.doc, text: parsed.raw, hash: parsed.hash, ref: "pasika/filename-case", note: "reports it" };
}

void describe("writeRegistry", () => {
  void it("writes entries in document order, then line order within each doc", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-write-"));
    mkdirSync(path.join(root, "rules"), { recursive: true });
    // Two docs whose path order and requirement order both matter.
    writeFileSync(
      path.join(root, "rules", "b-rule.md"),
      "# B Rule\n\n- A b-first requirement MUST hold.\n- A b-second requirement MUST hold too.\n",
    );
    writeFileSync(
      path.join(root, "rules", "a-rule.md"),
      "# A Rule\n\n- An a-first requirement MUST hold.\n- An a-second requirement MUST hold too.\n",
    );

    const parsed = parseDocs(root).flatMap((doc) =>
      doc.requirements.map((requirement) => ({ doc: doc.doc, ...requirement })),
    );
    // Deliberately shuffled: reverse of the doc order.
    const registryPath = path.join(root, "registry.json");
    writeRegistry(registryPath, { requirements: parsed.map(toEntry).reverse() }, root);

    const written = readRegistry(registryPath);
    assert.deepEqual(
      written.requirements.map((entry) => entry.hash),
      parsed.map((entry) => entry.hash),
      "registry reads in the same order as the docs",
    );
  });

  void it("places an entry whose hash the docs no longer contain after the parsed ones", () => {
    const root = mkdtempSync(path.join(tmpdir(), "pasika-write-"));
    writeFileSync(path.join(root, "only-rule.md"), "# Only Rule\n\n- The one requirement MUST hold.\n");

    const parsed = parseDocs(root).flatMap((doc) =>
      doc.requirements.map((requirement) => ({ doc: doc.doc, ...requirement })),
    );
    const stale: Requirement = {
      doc: "only-rule.md",
      text: "A removed requirement MUST be gone.",
      hash: "0000000000",
      note: "the bullet was deleted from the doc",
    };

    const registryPath = path.join(root, "registry.json");
    writeRegistry(registryPath, { requirements: [stale, ...parsed.map(toEntry)] }, root);

    const written = readRegistry(registryPath);
    assert.deepEqual(
      written.requirements.map((entry) => entry.hash),
      [...parsed.map((entry) => entry.hash), stale.hash],
      "the stale entry trails the parsed ones",
    );
  });
});
