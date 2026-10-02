import { describe, expect, test } from "vitest";
import { z } from "zod";
import { defineApiContract } from "./api-contract";
import { HttpError } from "./http-error";
import { HttpMethod } from "./http-method";
import { withResponse } from "./with-response";

const responseSchema = z.object({ id: z.string() });
const contract = defineApiContract({
  method: HttpMethod.Get,
  path: "/api/media",
  responseSchema,
});

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe("withResponse", () => {
  test("answers the handler's data through the response schema", async () => {
    const handler = withResponse(contract, () =>
      Promise.resolve({
        data: { id: "abc" },
        status: 201,
        headers: { "x-step": "read" },
      }),
    );

    const response = await handler();

    expect(response.status).toBe(201);
    expect(response.headers.get("x-step")).toBe("read");
    await expect(response.json()).resolves.toEqual({ id: "abc" });
  });

  test("answers an HttpError at the status it carries, uncacheable", async () => {
    const handler = withResponse(contract, () => Promise.reject(new HttpError("Missing session.", 401)));

    const response = await handler();

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ message: "Missing session." });
  });

  test("lets a failure that is not an HttpError stay an error", async () => {
    const handler = withResponse(contract, () => Promise.reject(new Error("boom")));

    await expect(handler()).rejects.toThrow("boom");
  });

  test("rejects data the response schema does not allow", async () => {
    const strictSchema = z.object({ id: z.string().min(5) });
    const strictContract = defineApiContract({
      method: HttpMethod.Get,
      path: "/api/media",
      responseSchema: strictSchema,
    });
    const handler = withResponse(strictContract, () => Promise.resolve({ data: { id: "ab" } }));

    await expect(handler()).rejects.toBeInstanceOf(z.ZodError);
  });

  test("passes a relayed body through at its own status", async () => {
    const handler = withResponse(() =>
      Promise.resolve({ body: streamOf("bytes"), status: 206, headers: { "content-range": "bytes 0-4/10" } }),
    );

    const response = await handler();

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-4/10");
    await expect(response.text()).resolves.toBe("bytes");
  });

  test("hands the request arguments to the handler", async () => {
    const handler = withResponse(contract, (_request: string) => Promise.resolve({ data: { id: "abc" } }));

    const response = await handler("from the request");

    await expect(response.json()).resolves.toEqual({ id: "abc" });
  });

  test("answers a call that names a schema and no handler beside it at 500", async () => {
    const response = await withResponse(contract)();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "withResponse requires an API contract and a handler.",
    });
  });
});
