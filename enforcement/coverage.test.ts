import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { classifyRequirement } from "./coverage.js";
import { parseDocs } from "./parse-docs.js";
import type { Registry } from "./types.js";

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
    assert.throws(() => classify({ hash: "deadbeef00", kind: "judgment", note: "why" }), /has hash "deadbeef00"/);
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

  void it("rejects a documentation check that does not exist", () => {
    assert.throws(
      () => classify({ hash: mustRequirement.hash, kind: "docs-check", ref: "no-such-check" }),
      /is not a documentation check/,
    );
  });

  void it("rejects a ref on a kind that nothing reports", () => {
    assert.throws(
      () => classify({ hash: mayRequirement.hash, kind: "permission", ref: "pasika/filename-case" }),
      /takes no --ref/,
    );
  });

  void it("rejects judgment and planned without a note, because the note is the whole content", () => {
    assert.throws(() => classify({ hash: mustRequirement.hash, kind: "judgment" }), /needs --note/);
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

  void it("accepts several refs for one requirement", () => {
    const { requirement } = classify({
      hash: mustRequirement.hash,
      kind: "docs-check",
      ref: "overview-length, no-template-prompt",
    });
    assert.equal(requirement.ref, "overview-length, no-template-prompt");
  });
});
