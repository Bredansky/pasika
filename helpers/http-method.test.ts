import { describe, expect, it } from "vitest";
import { HttpMethod } from "./http-method";

describe("HttpMethod", () => {
  it("exposes the standard HTTP methods", () => {
    expect(Object.values(HttpMethod)).toEqual([
      "GET",
      "HEAD",
      "POST",
      "PUT",
      "DELETE",
      "CONNECT",
      "OPTIONS",
      "TRACE",
      "PATCH",
    ]);
  });
});
