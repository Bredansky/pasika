import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { alignmentError, assertTypescriptAlignment } from "./ts-alignment";

void describe("pasika TypeScript alignment diagnostic", () => {
  it("accepts the same major (minor/patch drift is safe: the TypeFlags layout is stable within a major)", () => {
    assert.equal(alignmentError("6.0.3", "6.1.0"), null);
    assert.equal(alignmentError("6.1.2", "6.0.3"), null);
  });

  it("rejects an older consumer major, urging an upgrade to pasika's bundled major", () => {
    const error = alignmentError("6.0.3", "5.9.3");
    assert.ok(error, "the 5 -> 6 split that crashed every type-aware rule must be diagnosed");
    assert.match(error.message, /mismatch/i);
    assert.match(error.message, /typescript 6\.0\.3/);
    assert.match(error.message, /Upgrade your typescript to \^6/);
  });

  it("rejects a newer consumer major, urging alignment for now", () => {
    const error = alignmentError("6.0.3", "7.0.2");
    assert.ok(error);
    assert.match(error.message, /ahead of the compiler pasika ships/);
    assert.match(error.message, /Pin typescript to \^6/);
  });

  it("skips when either copy cannot be resolved — never blocks an undeterminable setup", () => {
    assert.equal(alignmentError(null, "6.0.3"), null);
    assert.equal(alignmentError("6.0.3", null), null);
    assert.equal(alignmentError(null, null), null);
  });

  it("does not throw when resolved from inside pasika itself (bundled == hoisted)", () => {
    // pasika's own repo lints itself with one hoisted typescript; running the
    // real resolution back-to-back must agree and pass.
    assert.doesNotThrow(() => {
      assertTypescriptAlignment();
    });
  });
});