import { describe, it, expect } from "vitest";
const handler = require("../src/lib/handler");

describe("handleData", () => {
  it("should return the latest and edge version", () => {
    const result = handler.handleData(defaultData);

    expect(result).toEqual(defaultTarget);
  });

  it("run handle with empty data", () => {
    const result = handler.handleData({
      tags: { data: [] },
      branchs: { data: [] },
    });

    expect(result).toEqual({ latest: null, edge: null });
  });
});

const defaultData = {
  tags: {
    data: [
      { name: "v1.0.3", commit: { sha: "c66b051298dc0fc0bdd131e2" } },
      { name: "v1.0.2-alpha", commit: { sha: "54aea0d96dbd7bcd1f1b5d7f" } },
      { name: "v1.0.2", commit: { sha: "826b72196f3bbfe9748d290e" } },
      { name: "v1.0.1", commit: { sha: "7143cdd3ccdc95ef00d48118" } },
      { name: "v1.0.1-beta.1", commit: { sha: "48cef43102369ef76e90ffa3" } },
      { name: "v1.0.0", commit: { sha: "cb3ebdfca6618f29215bab97" } },
    ],
  },
  branchs: {
    data: [
      { name: "dev", commit: { sha: "33563bb3b7d5a5dd56c5308f" } },
      { name: "master", commit: { sha: "c66b051298dc0fc0bdd131e2" } },
    ],
  },
};

const defaultTarget = {
  latest: {
    name: "v1.0.3",
    sha: "c66b051298dc0fc0bdd131e2",
    short_sha: "c66b051",
  },
  edge: {
    name: "master",
    sha: "c66b051298dc0fc0bdd131e2",
    short_sha: "c66b051",
  },
};
