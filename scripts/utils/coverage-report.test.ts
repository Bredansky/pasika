import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, it } from "vitest";
import { buildCoverageReport, type CoverageIssue } from "./coverage-report";
import { hashRequirement, normalizeRequirement } from "./normalize";
import type { Requirement } from "../types";

/** A Rule whose bullets give every branch of the report one requirement to hang off. */
const DOC = `# Example Rule

A rule the fixture records.

- A module MUST use named exports.
- A module MAY re-export a sibling.
- A module MUST declare its return type.
- A handler MUST be wrapped in an adapter.
- A module MUST request through an outbound helper.
- A module MUST NOT call fetch directly.
`;

/** Titles the rules tree carries, so one requirement has a test behind it and one does not. */
const TEST_FILE = `void describe("A module MUST use named exports.", () => {});\nvoid describe("An unrelated title.", () => {});\n`;

const root = mkdtempSync(path.join(tmpdir(), "pasika-coverage-report-"));
const docsRoot = path.join(root, "docs");
const rulesDir = path.join(root, "eslint", "rules");

mkdirSync(path.join(docsRoot, "rules"), { recursive: true });
mkdirSync(path.join(rulesDir, "package-json"), { recursive: true });
writeFileSync(path.join(docsRoot, "rules", "example-rule.md"), DOC);
writeFileSync(path.join(rulesDir, "package-json", "example-rule.test.ts"), TEST_FILE);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A registry entry for a bullet of the fixture doc. */
function recorded(bullet: string, ref?: string): Requirement {
  const text = normalizeRequirement(bullet);
  return { doc: "rules/example-rule.md", text, hash: hashRequirement(text), ref };
}

const REGISTRY = {
  requirements: [
    recorded("- A module MUST use named exports.", "pasika/cn-helper"),
    recorded("- A module MAY re-export a sibling."),
    recorded("- A module MUST declare its return type.", "pasika/not-a-rule"),
    recorded("- A handler MUST be wrapped in an adapter.", "pasika/zod-fetch-helper"),
    // Reworded in the doc: the same ask, said with fewer words.
    recorded("- A module MUST request through the shared outbound helper.", "pasika/zod-fetch-helper"),
    // Recorded but gone from the doc.
    recorded("- A module MUST log its failures."),
  ],
};

const report = buildCoverageReport({ docsRoot, registry: REGISTRY, rulesDir });

function issuesOf(kind: CoverageIssue["kind"]): CoverageIssue[] {
  return report.issues.filter((issue) => issue.kind === kind);
}

/** The one issue of a kind the fixture report holds, for the tests that assert on its fields. */
function issueOf(kind: CoverageIssue["kind"]): CoverageIssue {
  const [issue] = issuesOf(kind);
  if (!issue) throw new Error(`the fixture report holds no ${kind} issue`);
  return issue;
}

void describe("buildCoverageReport", () => {
  it("counts every requirement the registry still records", () => {
    assert.equal(report.total, 6);
    // Three recorded refs still match their bullet, and the reworded one keeps its ref.
    assert.equal(report.governed, 4);
    assert.equal(report.judgment, 1);
  });

  it("reports a recorded requirement whose ref names no rule", () => {
    const unknown = issueOf("unknown-ref");
    assert.equal(unknown.doc, "rules/example-rule.md");
    assert.equal(unknown.detail, 'ref "pasika/not-a-rule" does not exist');
  });

  it("reports a rule-governed requirement no rule test is titled with", () => {
    const missing = issueOf("missing-test");
    assert.equal(missing.text, "A handler MUST be wrapped in an adapter.");
    assert.equal(missing.detail, "no rule test is titled with this requirement");
  });

  it("reports a reworded requirement as changed and rehashes it", () => {
    const changed = issueOf("changed");
    assert.equal(changed.text, "A module MUST request through an outbound helper.");
    assert.equal(
      changed.detail,
      'was "A module MUST request through the shared outbound helper." — re-verify  pasika/zod-fetch-helper',
    );
    assert.equal(
      report.nextRegistry.requirements.some((entry) => entry.hash === changed.hash),
      true,
    );
  });

  it("reports a bullet the registry does not record as new and leaves it unrecorded", () => {
    const added = issueOf("new");
    assert.equal(added.text, "A module MUST NOT call fetch directly.");
    assert.equal(
      report.nextRegistry.requirements.some((entry) => entry.hash === added.hash),
      false,
    );
  });

  it("drops a recorded requirement whose bullet is gone", () => {
    const removed = issueOf("removed");
    assert.equal(removed.text, "A module MUST log its failures.");
    assert.equal(removed.detail, "recorded with no check but the bullet is gone");
    // The four bullets that still match, plus the reworded one under its new hash.
    assert.equal(report.nextRegistry.requirements.length, 5);
  });

  it("reports every exported rule no requirement is assigned to", () => {
    const unassigned = issuesOf("unassigned-rule");
    assert.equal(
      unassigned.some((issue) => issue.text === "pasika/filename-case"),
      true,
    );
    assert.equal(
      unassigned.some((issue) => issue.text === "pasika/cn-helper"),
      false,
    );
  });
});
