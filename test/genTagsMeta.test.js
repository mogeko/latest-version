import { describe, it, expect } from "vitest";
const handler = require("../src/lib/docker");
const R = require("ramda");

describe("genTagsMeta", () => {
  it("if master and tag point to different commits", () => {
    const result = handler.genTagsMeta(defaultData, [true, true]);

    expect(R.split("\n")(result)).toEqual(defaultTarget);
  });

  it("if master and tag point to same commit", () => {
    const data = R.assocPath(["latest", "short_sha"], "c66b051")(defaultData);

    const result = handler.genTagsMeta(data, [true, true]);

    expect(R.length(R.split("\n")(result))).toEqual(4);
  });

  it("if latest and edge do not update", () => {
    const result = handler.genTagsMeta(defaultData, [false, false]);

    const gouped = geoupResult(R.split("\n")(result));

    expect(R.length(R.prop("false")(gouped))).toEqual(5);
    expect(R.prop("true")(gouped)).toBeUndefined();
  });

  it("if only edge update", () => {
    const result = handler.genTagsMeta(defaultData, [true, false]);

    const gouped = geoupResult(R.split("\n")(result));

    expect(R.length(R.prop("false")(gouped))).toEqual(2);
    expect(R.length(R.prop("true")(gouped))).toEqual(3);
  });

  it("if only latest update", () => {
    const result = handler.genTagsMeta(defaultData, [false, true]);

    const gouped = geoupResult(R.split("\n")(result));

    expect(R.length(R.prop("false")(gouped))).toEqual(3);
    expect(R.length(R.prop("true")(gouped))).toEqual(2);
  });
});

const geoupResult = R.groupBy(
  R.ifElse(R.includes("false"), R.always("false"), R.always("true"))
);

const defaultData = {
  latest: { name: "v1.0.3", short_sha: "33563bb" },
  edge: { short_sha: "c66b051" },
};

const defaultTarget = [
  "type=raw,value=latest,enable=true",
  "type=raw,value=v1.0.3,enable=true",
  "type=raw,value=33563bb,enable=true",
  "type=raw,value=edge,enable=true",
  "type=raw,value=c66b051,enable=true",
];
