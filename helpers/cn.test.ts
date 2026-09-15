import { describe, expect, test } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  test("resolves conflicting utilities in favour of the later class", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  test("keeps conditional and nested class inputs", () => {
    const isHidden = (value: boolean): boolean => value;

    expect(cn("text-sm", isHidden(false) && "hidden", ["font-bold", null, undefined])).toBe("text-sm font-bold");
  });

  test("answers an empty string when no class applies", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});
