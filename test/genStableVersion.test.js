import { describe, it, expect } from "vitest";
const handler = require("../src/lib/handler");

describe("genStableVersion", () => {
  it("should return the latest version", () => {
    const result = handler.genStableVersion({
      latest: { name: "v1.0.3" },
      edge: { short_sha: "c66b051" },
    });

    expect(result).toEqual("v1.0.3");
  });

  it("should return the short sha of mian branch", () => {
    const result = handler.genStableVersion({
      latest: null,
      edge: { short_sha: "c66b051" },
    });

    expect(result).toEqual("c66b051");
  });
});
