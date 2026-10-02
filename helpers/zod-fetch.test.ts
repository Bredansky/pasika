import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { defineApiContract } from "./api-contract";
import { HttpError } from "./http-error";
import { HttpMethod } from "./http-method";
import { zodFetch } from "./zod-fetch";

const payloadSchema = z.object({ id: z.string() });
const mediaContract = defineApiContract({
  method: HttpMethod.Get,
  path: "https://api.test/media",
  responseSchema: payloadSchema,
});

function answerWith(response: Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(response)),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("zodFetch", () => {
  test("returns JSON data accepted by the contract response schema", async () => {
    answerWith(Response.json({ id: "abc" }));

    await expect(zodFetch({ contract: mediaContract })).resolves.toEqual({ id: "abc" });
  });

  test("rejects a body the contract response schema does not allow", async () => {
    answerWith(Response.json({ id: 42 }));

    await expect(zodFetch({ contract: mediaContract })).rejects.toBeInstanceOf(z.ZodError);
  });

  test("uses one API contract for URL, method, request validation, and response validation", async () => {
    answerWith(Response.json({ id: "abc" }));
    const requestSchema = z.object({ title: z.string() });
    const contract = defineApiContract({
      method: HttpMethod.Post,
      path: "/api/media",
      requestSchema,
      responseSchema: payloadSchema,
    });

    await expect(
      zodFetch({
        contract,
        init: { body: JSON.stringify({ title: "hello" }) },
      }),
    ).resolves.toEqual({ id: "abc" });

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/media", {
      body: JSON.stringify({ title: "hello" }),
      method: HttpMethod.Post,
    });
  });

  test("allows the concrete URL to override a contract path", async () => {
    answerWith(Response.json({ id: "abc" }));

    await zodFetch({ contract: mediaContract, url: "https://api.test/media/7" });

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("https://api.test/media/7", {
      method: HttpMethod.Get,
    });
  });

  test("rejects an invalid structured request body before fetching", async () => {
    answerWith(Response.json({ id: "abc" }));
    const requestSchema = z.object({ title: z.string() });
    const contract = defineApiContract({
      method: HttpMethod.Post,
      path: "/api/media",
      requestSchema,
      responseSchema: payloadSchema,
    });

    await expect(
      zodFetch({
        contract,
        init: { body: JSON.stringify({ title: 42 }) },
      }),
    ).rejects.toBeInstanceOf(z.ZodError);

    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  test("uses the standard error message body on a failed response", async () => {
    answerWith(
      new Response(JSON.stringify({ message: "Too many requests." }), {
        status: 429,
        statusText: "Too Many Requests",
      }),
    );

    const error = await zodFetch({ contract: mediaContract }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      status: 429,
      message: "Too many requests.",
      data: { message: "Too many requests." },
    });
  });

  test("falls back to the status when a failed response does not match the error schema", async () => {
    answerWith(new Response("<html>gateway</html>", { status: 502 }));

    const error = await zodFetch({ contract: mediaContract }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      status: 502,
      message: "Request failed with status 502",
      data: "<html>gateway</html>",
    });
  });

  test("hands a response back unread when the call has no API contract", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("bytes"));
        controller.close();
      },
    });
    answerWith(new Response(stream, { status: 206, headers: { "content-range": "bytes 0-4/10" } }));

    const relayed = await zodFetch({ url: "https://api.test/file" });

    expect(relayed.status).toBe(206);
    expect(relayed.headers.get("content-range")).toBe("bytes 0-4/10");
    expect(relayed.body).toBeInstanceOf(ReadableStream);
    expect(relayed.body.locked).toBe(false);
  });

  test("throws a 502 when the upstream answered with nothing to relay", async () => {
    answerWith(new Response(null, { status: 204 }));

    const error = await zodFetch({ url: "https://api.test/file" }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ status: 502, message: "The upstream answered without a body to relay." });
  });

  test("allows a contracted success to carry no body when its response schema does", async () => {
    answerWith(new Response(null, { status: 204 }));
    const contract = defineApiContract({
      method: HttpMethod.Post,
      path: "https://api.test/workflows/7/dispatches",
      responseSchema: z.undefined(),
    });

    await expect(zodFetch({ contract })).resolves.toBeUndefined();
  });

  test("throws a 502 when a contracted success carries no body its schema wants", async () => {
    answerWith(new Response(null, { status: 204 }));

    const error = await zodFetch({ contract: mediaContract }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ status: 502, message: "The upstream answered without a body to decode." });
  });
});
