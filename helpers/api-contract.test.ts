import { describe, expect, test } from "vitest";
import { z } from "zod";
import { defineApiContract } from "./api-contract";
import { HttpMethod } from "./http-method";

describe("defineApiContract", () => {
  test("keeps one immutable method, path, request schema, and response schema", () => {
    const requestSchema = z.object({ title: z.string() });
    const responseSchema = z.object({ id: z.string() });

    const contract = defineApiContract({
      method: HttpMethod.Post,
      path: "/api/orders",
      requestSchema,
      responseSchema,
    });

    expect(contract).toEqual({
      method: HttpMethod.Post,
      path: "/api/orders",
      requestSchema,
      responseSchema,
    });
    expect(Object.isFrozen(contract)).toBe(true);
  });
});
