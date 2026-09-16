import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";
import { HttpError } from "./http-error";
import { zodFetch } from "./zod-fetch";

const payloadSchema = z.object({ id: z.string() });

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
  test("hands a JSON body back as data the response schema accepted", async () => {
    answerWith(Response.json({ id: "abc" }));

    await expect(zodFetch({ url: "https://api.test/media", responseSchema: payloadSchema })).resolves.toEqual({
      id: "abc",
    });
  });

  test("rejects a body the response schema does not allow", async () => {
    answerWith(Response.json({ id: 42 }));

    await expect(zodFetch({ url: "https://api.test/media", responseSchema: payloadSchema })).rejects.toBeInstanceOf(
      z.ZodError,
    );
  });

  test("passes the request through to fetch", async () => {
    answerWith(Response.json({ id: "abc" }));
    const init = { method: "POST", body: "payload" };

    await zodFetch({ url: "https://api.test/media", init, responseSchema: payloadSchema });

    expect(vi.mocked(fetch)).toHaveBeenCalledWith("https://api.test/media", init);
  });

  test("throws the status the upstream reported, with what it answered with", async () => {
    answerWith(
      new Response(JSON.stringify({ message: "Too many requests." }), {
        status: 429,
        statusText: "Too Many Requests",
      }),
    );

    const error = await zodFetch({ url: "https://api.test/media", responseSchema: payloadSchema }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      status: 429,
      message: "Request failed with status 429 Too Many Requests",
      data: { message: "Too many requests." },
    });
  });

  test("keeps a body that is not JSON as the text the upstream sent it as", async () => {
    answerWith(new Response("<html>gateway</html>", { status: 502 }));

    const error = await zodFetch({ url: "https://api.test/media", responseSchema: payloadSchema }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toMatchObject({
      status: 502,
      message: "Request failed with status 502",
      data: "<html>gateway</html>",
    });
  });

  test("hands the response back unread when the call names no response schema", async () => {
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

  test("answers a success the response schema allows to carry no body", async () => {
    answerWith(new Response(null, { status: 204 }));

    await expect(
      zodFetch({ url: "https://api.test/workflows/7/dispatches", responseSchema: z.undefined() }),
    ).resolves.toBeUndefined();
  });

  test("throws a 502 when a success carries no body the schema wants", async () => {
    answerWith(new Response(null, { status: 204 }));

    const error = await zodFetch({
      url: "https://api.test/orders/7",
      responseSchema: payloadSchema,
    }).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ status: 502, message: "The upstream answered without a body to decode." });
  });
});
