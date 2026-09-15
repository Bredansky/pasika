import { describe, expect, test } from "vitest";
import { HttpError } from "./http-error";

describe("HttpError", () => {
  test("carries the status a route answers with and the message a client reads", () => {
    const error = new HttpError("Missing session.", 401);

    expect(error.status).toBe(401);
    expect(error.message).toBe("Missing session.");
  });

  test("hands nothing on when the failure has nothing to hand on", () => {
    expect(new HttpError("Missing session.", 401).data).toBeNull();
  });

  test("keeps what a failed upstream answered with", () => {
    expect(new HttpError("Request failed with status 429", 429, { retryAfter: 30 }).data).toEqual({
      retryAfter: 30,
    });
  });

  test("stays an error, so an unhandled failure still reads as one", () => {
    expect(new HttpError("Missing session.", 401)).toBeInstanceOf(Error);
  });
});
