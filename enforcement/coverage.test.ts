import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { classifyRequirement, readRegistry, writeRegistry } from "./coverage";
import { parseDocs } from "./parse-docs";
import type { Registry, Requirement } from "./types";

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
    assert.throws(() => classify({ hash: "deadbeef00", kind: "manual", note: "why" }), /has hash "deadbeef00"/);
  });

  void it("rejects the eslint kind without a rule id", () => {
    assert.throws(() => classify({ hash: mustRequirement.hash, kind: "eslint" }), /needs --ref/);
  });

  void it("rejects a rule id the plugin does not provide", () => {
    assert.throws(
      () => classify({ hash: mustRequirement.hash, kind: "eslint", ref: "pasika/not-a-rule" }),
      /is not a rule in the plugin/,
    );
  });

  void it("rejects a ref on a kind that nothing reports", () => {
    assert.throws(
      () => classify({ hash: mayRequirement.hash, kind: "manual", ref: "pasika/filename-case" }),
      /takes no --ref/,
    );
  });

  void it("rejects manual and planned without a note, because the note is the whole content", () => {
    assert.throws(() => classify({ hash: mustRequirement.hash, kind: "manual" }), /needs --note/);
    assert.throws(() => classify({ hash: mustRequirement.hash, kind: "planned", note: "  " }), /needs --note/);
  });

  void it("records the requirement as the documentation currently words it", () => {
    const { registry, requirement, previousKind } = classify({
      hash: mustRequirement.hash,
      kind: "eslint",
      ref: "pasika/filename-case",
    });
    assert.equal(requirement.text, mustRequirement.text);
    assert.equal(requirement.doc, "rules/example-rule.md");
    assert.equal(requirement.ref, "pasika/filename-case");
    assert.equal(previousKind, undefined);
    assert.equal(registry.requirements.length, 1);
  });

  void it("reports the previous kind when a requirement is reclassified", () => {
    const first = classify({ hash: mustRequirement.hash, kind: "planned", note: "eslint: a future rule" });
    const second = classifyRequirement({
      docsRoot,
      registry: first.registry,
      input: { hash: mustRequirement.hash, kind: "eslint", ref: "pasika/filename-case" },
    });
    assert.equal(second.previousKind, "planned");
    assert.equal(second.registry.requirements.length, 1, "reclassifying replaces rather than duplicates");
    assert.equal(second.requirement.note, undefined, "the stale note does not survive the new kind");
  });

  void it("accepts several rule refs for one requirement", () => {
    const { requirement } = classify({
      hash: mustRequirement.hash,
      kind: "eslint",
      ref: "pasika/overview-length, pasika/no-template-prompt",
    });
    assert.equal(requirement.ref, "pasika/overview-length, pasika/no-template-prompt");
  });
});

/** A registry entry for one parsed requirement. */
function toEntry(parsed: { doc: string; raw: string; hash: string }): Requirement {
  return { doc: parsed.doc, text: parsed.raw, hash: parsed.hash, kind: "eslint", ref: "pasika/filename-case" };
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
      kind: "manual",
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
