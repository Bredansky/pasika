import { describe, expect, it } from "vitest";
import { defineContractMapping } from "./contract-mapping";

describe("defineContractMapping", () => {
  it("preserves an explicitly mapped contract", () => {
    const credentials = { accessTokenSecret: "secret" };
    const mapping = defineContractMapping({ accessSecret: credentials.accessTokenSecret });

    expect(mapping).toEqual({ accessSecret: "secret" });
  });
});
