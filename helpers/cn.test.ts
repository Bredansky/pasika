import { describe, expect, test } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  test("resolves conflicting utilities in favour of the later class", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  test("replaces the narrower classes a wider class later in the list covers", () => {
    expect(cn("px-2", "p-4")).toBe("p-4");
    expect(cn("p-4", "px-2")).toBe("p-4 px-2");
  });

  test("keeps a class a variant prefix scopes away from the base class", () => {
    expect(cn("hover:px-2", "px-4")).toBe("hover:px-2 px-4");
    expect(cn("px-4", "hover:px-2")).toBe("px-4 hover:px-2");
  });

  test("keeps conditional and nested class inputs", () => {
    const isHidden = (value: boolean): boolean => value;

    expect(cn("text-sm", isHidden(false) && "hidden", ["font-bold", null, undefined])).toBe("text-sm font-bold");
  });

  test("answers an empty string when no class applies", () => {
    expect(cn(false, null, undefined)).toBe("");
  });
});
