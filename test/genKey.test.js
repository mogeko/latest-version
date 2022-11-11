import { describe, it, expect } from "vitest";
const cache = require("../src/lib/cache");

describe("genKey", () => {
  it("if latest and edge has different sha", () => {
    const result = cache.genKey({
      latest: { sha: "a" },
      edge: { sha: "b" },
    });

    expect(result).toEqual("latest-version-a-b");
  });

  it("if latest and edge has same sha", () => {
    const result = cache.genKey({
      latest: { sha: "a" },
      edge: { sha: "a" },
    });

    expect(result).toEqual("latest-version-a");
  });

  it("if latest is null", () => {
    const result = cache.genKey({
      latest: null,
      edge: { sha: "a" },
    });

    expect(result).toEqual("latest-version-a");
  });
});
