import { describe, expect, test } from "vitest";
import { z } from "zod";
import { responseEnvelope } from "./response-envelope";

describe("responseEnvelope", () => {
  const schema = responseEnvelope(z.object({ id: z.string() }));

  test("accepts a successful response with data", () => {
    expect(schema.parse({ success: true, data: { id: "abc" } })).toEqual({
      success: true,
      data: { id: "abc" },
    });
  });

  test("accepts a failed response with null data and a message", () => {
    expect(schema.parse({ success: false, data: null, message: "Missing session." })).toEqual({
      success: false,
      data: null,
      message: "Missing session.",
    });
  });
});
