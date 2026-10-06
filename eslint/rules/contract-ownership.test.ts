import { describe, expect, it } from "vitest";
import { typedParserServices } from "./contract-ownership";

void describe("Contract ownership resolution requires complete typed parser services.", () => {
  it("accepts structurally complete typed parser services", () => {
    const program = { getTypeChecker: () => ({}), getSourceFiles: () => [] };
    const esTreeNodeToTSNodeMap = { get: (): undefined => undefined };

    expect(typedParserServices({ program, esTreeNodeToTSNodeMap })).toEqual({ program, esTreeNodeToTSNodeMap });
  });

  it.each([
    undefined,
    null,
    {},
    { program: null, esTreeNodeToTSNodeMap: { get: (): undefined => undefined } },
    { program: {}, esTreeNodeToTSNodeMap: { get: (): undefined => undefined } },
    {
      program: { getTypeChecker: 1, getSourceFiles: () => [] },
      esTreeNodeToTSNodeMap: { get: (): undefined => undefined },
    },
    {
      program: { getTypeChecker: () => ({}), getSourceFiles: 1 },
      esTreeNodeToTSNodeMap: { get: (): undefined => undefined },
    },
    {
      program: { getTypeChecker: () => ({}), getSourceFiles: () => [] },
      esTreeNodeToTSNodeMap: null,
    },
    {
      program: { getTypeChecker: () => ({}), getSourceFiles: () => [] },
      esTreeNodeToTSNodeMap: {},
    },
    {
      program: { getTypeChecker: () => ({}), getSourceFiles: () => [] },
      esTreeNodeToTSNodeMap: { get: 1 },
    },
  ])("returns no resolver for incomplete services %#", (parserServices) => {
    expect(typedParserServices(parserServices)).toBeUndefined();
  });
});
