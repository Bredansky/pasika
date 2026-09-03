import path from "node:path";
import { describe, expect, it } from "vitest";
import { sourceRootOf } from "./project-root";

describe("sourceRootOf", () => {
  it("resolves src from the ESLint working directory", () => {
    expect(sourceRootOf({ cwd: "/repo" })).toBe(path.resolve("/repo", "src"));
  });

  it("falls back to the process working directory", () => {
    expect(sourceRootOf({})).toBe(path.resolve(process.cwd(), "src"));
  });
});
